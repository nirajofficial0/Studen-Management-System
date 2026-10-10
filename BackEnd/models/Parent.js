const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema({
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
  phone: {
    type: String,
    required: true
  },
  relationship: {
    type: String,
    enum: ['father', 'mother', 'guardian'],
    required: true
  },
  child: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  address: String,
  city: String,
  state: String,
  pincode: String
}, { timestamps: true });

module.exports = mongoose.model('Parent', parentSchema);
