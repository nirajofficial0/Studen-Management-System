const express = require('express');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { getStore } = require('../dataStore');
const { writeDB } = require('../database');
const { verifyToken } = require('../middleware/authMiddleware');
const { isMongoReady } = require('../config/db');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  if (isMongoReady()) {
    const records = await Attendance.find().sort({ createdAt: -1 }).lean();
    return res.json(records.map(record => ({
      ...record,
      id: record._id ? record._id.toString() : record.id,
      studentId: record.studentId ? record.studentId.toString() : record.studentId
    })));
  }

  const store = getStore();
  return res.json(store.attendance);
});

router.post('/', verifyToken, async (req, res) => {
  const { email, name, subject, status } = req.body;

  if (!email || !name || !subject || !status) {
    return res.status(400).json({ message: 'Missing attendance fields' });
  }

  if (isMongoReady()) {
    const student = await User.findOne({ email: String(email).toLowerCase() });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const record = await Attendance.create({
      studentId: student._id,
      studentName: student.name,
      email: String(email).toLowerCase(),
      name,
      subject,
      status,
      date: new Date().toISOString()
    });

    return res.status(201).json({
      message: 'Attendance saved',
      attendance: {
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
    status,
    date: new Date().toISOString()
  };

  store.attendance.push(record);
  writeDB(store);

  return res.status(201).json({ message: 'Attendance saved', attendance: record });
});

module.exports = router;
