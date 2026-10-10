const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  creditHours: {
    type: Number,
    default: 3
  },
  description: String,
  academicYear: String
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);
