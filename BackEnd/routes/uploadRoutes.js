const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { verifyToken } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    const allowedTypes = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/avif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      'application/x-zip-compressed'
    ]);
    if (!allowedTypes.has(file.mimetype)) {
      return callback(new Error('Only PDF, image, Word, and ZIP files are allowed.'));
    }
    callback(null, true);
  }
});

const roleByPath = {
  assignment: ['student', 'teacher', 'admin'],
  document: ['student', 'admin'],
  material: ['teacher', 'admin']
};

function uploadToCloudinary(file, folder) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: `school-management/${folder}`, resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Cloudinary returned no upload result.'));
        resolve(result);
      }
    ).end(file.buffer);
  });
}

async function handleUpload(req, res, folder) {
  if (!process.env.CLOUDINARY_URL && !(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )) {
    return res.status(503).json({
      message: 'Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    const result = await uploadToCloudinary(req.file, folder);
    return res.status(201).json({
      success: true,
      message: `${folder} file uploaded successfully.`,
      fileName: req.file.originalname,
      fileSize: `${(req.file.size / 1024).toFixed(1)} KB`,
      fileUrl: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    return res.status(502).json({ message: `Cloudinary upload failed: ${error.message}` });
  }
}

for (const [folder, roles] of Object.entries(roleByPath)) {
  router.post(
    `/${folder}`,
    verifyToken,
    roleMiddleware(roles),
    (req, res, next) => upload.single('file')(req, res, error => {
      if (error) return res.status(400).json({ message: error.message });
      next();
    }),
    (req, res) => handleUpload(req, res, folder === 'material' ? 'materials' : `${folder}s`)
  );
}

module.exports = router;
