const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  feeType: {
    type: String,
    enum: ['tuition', 'transport', 'activity', 'other'],
    default: 'tuition'
  },
  month: String,
  academicYear: String,
  dueDate: Date,
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending'
  },
  paidDate: Date,
  paymentMethod: {
    type: String,
    enum: ['cash', 'online', 'check'],
    default: 'online'
  },
  transactionId: String,
  orderId: String,
  receiptNo: String,
  category: String,
  email: {
    type: String,
    lowercase: true,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Fee', feeSchema);
