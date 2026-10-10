const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'Present', 'Absent', 'Late'],
    default: 'present'
  }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
