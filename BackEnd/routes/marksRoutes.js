const express = require('express');
const Marks = require('../models/Marks');
const User = require('../models/User');
const { getStore } = require('../dataStore');
const { writeDB } = require('../database');
const { verifyToken } = require('../middleware/authMiddleware');
const { isMongoReady } = require('../config/db');
const multer = require('multer');
const xlsx = require('xlsx');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();
const importFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!/\.(csv|xlsx|xls)$/i.test(file.originalname)) {
      return callback(new Error('Upload a .csv, .xlsx, or .xls file.'));
    }
    callback(null, true);
  }
});

router.post('/bulk-upload', verifyToken, roleMiddleware(['admin', 'teacher']), (req, res, next) => {
  importFile.single('file')(req, res, error => {
    if (error) return res.status(400).json({ message: error.message });
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Select a CSV or Excel file.' });
  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);
    if (!rows.length) return res.status(400).json({ message: 'The uploaded file has no readable rows.' });
    if (rows.length > 100) return res.status(400).json({ message: 'A bulk import can contain at most 100 rows.' });

    const imported = [];
    const errors = [];
    const store = getStore();
    for (const [index, row] of rows.entries()) {
      const email = String(row.email || row.Email || '').trim().toLowerCase();
      const subject = String(row.subject || row.Subject || '').trim();
      const marksValue = Number(row.marks ?? row.Marks);
      if (!email || !subject || !Number.isFinite(marksValue) || marksValue < 0 || marksValue > 100) {
        errors.push(`Row ${index + 2}: valid email, subject, and marks from 0 to 100 are required.`);
        continue;
      }

      if (isMongoReady()) {
        const student = await User.findOne({ email, role: 'student' });
        if (!student) {
          errors.push(`Row ${index + 2}: student ${email} was not found.`);
          continue;
        }
        const record = await Marks.create({
          studentId: student._id,
          studentName: student.name,
          email,
          name: student.name,
          subject,
          marks: marksValue,
          exam: String(row.exam || row.Exam || 'Unit Test')
        });
        imported.push({ id: record._id.toString(), email, subject, marks: marksValue });
      } else {
        const student = store.users.find(user => user.email.toLowerCase() === email && user.role === 'student');
        if (!student) {
          errors.push(`Row ${index + 2}: student ${email} was not found.`);
          continue;
        }
        const record = {
          id: Date.now() + index,
          email,
          name: student.name,
          subject,
          marks: marksValue,
          exam: String(row.exam || row.Exam || 'Unit Test'),
          date: new Date().toISOString()
        };
        store.marks.push(record);
        imported.push(record);
      }
    }
    if (!isMongoReady()) writeDB(store);
    return res.json({ success: true, importedCount: imported.length, errors });
  } catch (error) {
    return res.status(400).json({ message: `Could not parse marks file: ${error.message}` });
  }
});

router.get('/', verifyToken, async (req, res) => {
  if (isMongoReady()) {
    const records = await Marks.find().sort({ createdAt: -1 }).lean();
    return res.json(records.map(record => ({
      ...record,
      id: record._id ? record._id.toString() : record.id,
      studentId: record.studentId ? record.studentId.toString() : record.studentId
    })));
  }

  const store = getStore();
  return res.json(store.marks);
});

router.post('/', verifyToken, async (req, res) => {
  const { email, name, subject, marks: markValue } = req.body;

  if (!email || !name || !subject || markValue === undefined) {
    return res.status(400).json({ message: 'Missing marks fields' });
  }

  if (isMongoReady()) {
    const student = await User.findOne({ email: String(email).toLowerCase() });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const record = await Marks.create({
      studentId: student._id,
      studentName: student.name,
      email: String(email).toLowerCase(),
      name,
      subject,
      marks: Number(markValue),
      exam: 'Unit Test'
    });

    return res.status(201).json({
      message: 'Marks saved',
      marks: {
        ...record.toObject(),
        id: record._id.toString(),
        studentId: record.studentId.toString()
      }
    });
  }

  const store = getStore();
  const record = {
    id: Date.now(),
    email,
    name,
    subject,
    marks: Number(markValue),
    date: new Date().toISOString()
  };

  store.marks.push(record);
  writeDB(store);

  return res.status(201).json({ message: 'Marks saved', marks: record });
});

module.exports = router;
