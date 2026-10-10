const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  phone: String,
  rollNo: String,
  course: String,
  semester: String,
  bloodGroup: String,
  guardianName: String,
  guardianPhone: String,
  role: {
    type: String,
    enum: ['admin', 'teacher', 'student', 'parent'],
    default: 'student'
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  department: String,
  profileImage: String,
  address: String,
  city: String,
  state: String,
  pincode: String,
  dateOfBirth: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
