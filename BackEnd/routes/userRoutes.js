const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const User = require('../models/User');
const { getStore } = require('../dataStore');
const { writeDB } = require('../database');
const { verifyToken } = require('../middleware/authMiddleware');
const { isMongoReady } = require('../config/db');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!/\.(csv|xlsx|xls)$/i.test(file.originalname)) {
      return callback(new Error('Upload a .csv, .xlsx, or .xls file.'));
    }
    callback(null, true);
  }
});

function sanitizeUser(user) {
  const plainUser = user && user.toObject ? user.toObject() : user;
  const { password, ...safeUser } = plainUser;
  return {
    ...safeUser,
    id: safeUser._id ? safeUser._id.toString() : safeUser.id
  };
}

router.get('/', async (req, res) => {
  if (isMongoReady()) {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    return res.json(users.map(sanitizeUser));
  }

  const store = getStore();
  const safeUsers = store.users.map(({ password, ...user }) => user);
  return res.json(safeUsers);
});

router.get('/students', async (req, res) => {
  if (isMongoReady()) {
    const students = await User.find({ role: 'student' }).sort({ createdAt: -1 }).lean();
    return res.json(students.map(sanitizeUser));
  }

  const store = getStore();
  const students = store.users.filter(user => user.role === 'student');
  const safeStudents = students.map(({ password, ...user }) => user);
  return res.json(safeStudents);
});

router.get('/teachers', async (req, res) => {
  if (isMongoReady()) {
    const teachers = await User.find({ role: 'teacher' }).sort({ createdAt: -1 }).lean();
    return res.json(teachers.map(sanitizeUser));
  }

  const store = getStore();
  const teachers = store.users.filter(user => user.role === 'teacher');
  const safeTeachers = teachers.map(({ password, ...user }) => user);
  return res.json(safeTeachers);
});

// Download sample CSV template for bulk user registration
router.get('/sample-csv', (req, res) => {
  const sampleCSV = `name,email,role,phone,password,rollNo
Aarav Sharma,aarav@school.com,student,9876543215,pass123,STD-2026-101
Diya Patel,diya@school.com,student,9876543216,pass123,STD-2026-102
Rohan Verma,rohan.faculty@school.com,teacher,9876543217,teach123,TCH-2026-05
Pooja Mehta,pooja@school.com,student,9876543218,pass123,STD-2026-103
Karan Joshi,karan@school.com,student,9876543219,pass123,STD-2026-104`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sample_users_template.csv"');
  return res.send(sampleCSV);
});

// Bulk Import Users / Students via Excel or CSV
router.post('/bulk-upload', verifyToken, roleMiddleware(['admin']), (req, res, next) => {
  uploadMemory.single('file')(req, res, error => {
    if (error) return res.status(400).json({ message: error.message });
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV or Excel file uploaded' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: 'The uploaded file is empty or has no readable rows.' });
    }
    if (rows.length > 100) {
      return res.status(400).json({ message: 'A bulk import can contain at most 100 rows.' });
    }

    const createdUsers = [];
    const errors = [];
    const mongoActive = isMongoReady();
    const store = getStore();

    for (const [index, row] of rows.entries()) {
      const name = row.name || row.Name || row['Full Name'];
      const email = (row.email || row.Email || '').toString().trim().toLowerCase();
      const role = (row.role || row.Role || 'student').toString().trim().toLowerCase();
      const password = (row.password || row.Password || 'Welcome@123').toString();
      const phone = (row.phone || row.Phone || '9876543210').toString();
      const rollNo = (row.rollNo || row.RollNo || `STD-2026-${100 + index}`).toString();

      if (typeof name !== 'string' || !name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Row ${index + 2}: A name and valid email are required.`);
        continue;
      }
      if (!['student', 'teacher', 'admin', 'parent'].includes(role)) {
        errors.push(`Row ${index + 2}: Role must be student, teacher, admin, or parent.`);
        continue;
      }

      if (mongoActive) {
        const exists = await User.findOne({ email });
        if (!exists) {
          const user = await User.create({ name, email, role, password, phone, rollNo });
          createdUsers.push(sanitizeUser(user));
        } else {
          errors.push(`Row ${index + 2}: ${email} already exists.`);
        }
      } else {
        const exists = store.users.some(u => u.email.toLowerCase() === email);
        if (!exists) {
          const newUser = { id: Date.now() + index, name, email, role, password, phone, rollNo };
          store.users.push(newUser);
          createdUsers.push(sanitizeUser(newUser));
        } else {
          errors.push(`Row ${index + 2}: ${email} already exists.`);
        }
      }
    }

    if (!mongoActive) {
      writeDB(store);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully imported ${createdUsers.length} users!`,
      importedCount: createdUsers.length,
      users: createdUsers,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to parse file: ' + err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Missing user fields' });
  }

  if (isMongoReady()) {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role
    });

    return res.status(201).json({ message: 'User created', user: sanitizeUser(newUser) });
  }

  const store = getStore();
  const exists = store.users.some(user => user.email.toLowerCase() === email.toLowerCase());

  if (exists) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const newUser = {
    id: Date.now(),
    name,
    email,
    password,
    role
  };

  store.users.push(newUser);
  writeDB(store);

  const { password: _, ...safeUser } = newUser;
  return res.status(201).json({ message: 'User created', user: safeUser });
});

router.delete('/:id', async (req, res) => {
  if (isMongoReady()) {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ message: 'User deleted successfully' });
  }

  const store = getStore();
  const userId = Number(req.params.id);
  const index = store.users.findIndex(user => user.id === userId);

  if (index === -1) {
    return res.status(404).json({ message: 'User not found' });
  }

  store.users.splice(index, 1);
  writeDB(store);
  return res.json({ message: 'User deleted successfully' });
});

module.exports = router;
