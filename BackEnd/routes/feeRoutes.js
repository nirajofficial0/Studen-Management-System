const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Fee = require('../models/Fee');
const User = require('../models/User');
const Parent = require('../models/Parent');
const { verifyToken } = require('../middleware/authMiddleware');
const { getStore } = require('../dataStore');
const { writeDB } = require('../database');
const { isMongoReady } = require('../config/db');

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  const Razorpay = require('razorpay');
  return { keyId, keySecret, client: new Razorpay({ key_id: keyId, key_secret: keySecret }) };
}

async function getFeeStudent(payer) {
  if (payer.role === 'student') {
    if (isMongoReady()) return User.findById(payer.id);
    return getStore().users.find(user => user.email.toLowerCase() === payer.email.toLowerCase());
  }
  if (payer.role !== 'parent') return null;

  if (isMongoReady()) {
    const parent = await Parent.findOne({ email: payer.email }).populate('child');
    if (parent && parent.child) return parent.child;
    const parentUser = await User.findById(payer.id);
    if (!parentUser || !parentUser.phone) return null;
    return User.findOne({ role: 'student', guardianPhone: parentUser.phone });
  }

  const store = getStore();
  const parent = store.users.find(user => user.email.toLowerCase() === payer.email.toLowerCase());
  if (!parent) return null;
  return store.users.find(user =>
    user.role === 'student' &&
    (String(user.parentId || '') === String(parent.id) ||
      (parent.phone && String(user.guardianPhone || '') === String(parent.phone)))
  ) || null;
}

async function getPendingAmount(student) {
  const totalFees = 45000;
  if (isMongoReady()) {
    const fees = await Fee.find({ student: student._id, status: 'paid' }).lean();
    return Math.max(0, totalFees - fees.reduce((sum, fee) => sum + fee.amount, 0));
  }

  const store = getStore();
  const transactions = store.studentTransactions || [];
  const paid = transactions
    .filter(transaction => transaction.status === 'Success' && transaction.email === student.email)
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const paidAmount = store.paidFeesByStudent && store.paidFeesByStudent[student.email];
  const existingPaidAmount = student.email === 'student@school.com' ? Number(store.paidFeesAmount ?? 30000) : paid;
  return Math.max(0, totalFees - Number(paidAmount ?? existingPaidAmount));
}

router.post('/create-razorpay-order', verifyToken, async (req, res) => {
  try {
    const gateway = getRazorpay();
    if (!gateway) {
      return res.status(503).json({ message: 'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.' });
    }

    const student = await getFeeStudent(req.user);
    if (!student) return res.status(403).json({ message: 'No linked student account was found for this payment.' });
    const pendingAmount = await getPendingAmount(student);
    const payAmount = Number(req.body.amount);
    if (!Number.isSafeInteger(payAmount) || payAmount < 1 || payAmount > pendingAmount) {
      return res.status(400).json({ message: `Enter an amount between ₹1 and ₹${pendingAmount}.` });
    }

    const order = await gateway.client.orders.create({
      amount: payAmount * 100,
      currency: 'INR',
      receipt: `fee_${crypto.randomBytes(8).toString('hex')}`,
      notes: { studentId: String(student._id || student.id), payerId: String(req.user.id), studentEmail: student.email }
    });
    return res.json({
      success: true,
      keyId: gateway.keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      studentName: student.name,
      studentEmail: req.user.email
    });
  } catch (error) {
    res.status(502).json({ message: `Could not create Razorpay order: ${error.message}` });
  }
});

router.post('/verify-payment', verifyToken, async (req, res) => {
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ success: false, message: 'Razorpay payment details are required.' });
    }

    const gateway = getRazorpay();
    if (!gateway) {
      return res.status(503).json({ message: 'Razorpay is not configured. Payment cannot be verified.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', gateway.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    const provided = Buffer.from(signature, 'hex');
    const expected = Buffer.from(expectedSignature, 'hex');
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      return res.status(400).json({ success: false, message: 'Invalid Razorpay payment signature.' });
    }

    const student = await getFeeStudent(req.user);
    if (!student) return res.status(403).json({ message: 'No linked student account was found for this payment.' });
    const [order, payment] = await Promise.all([
      gateway.client.orders.fetch(orderId),
      gateway.client.payments.fetch(paymentId)
    ]);
    if (
      String(order.notes && order.notes.studentId) !== String(student._id || student.id) ||
      String(order.notes && order.notes.payerId) !== String(req.user.id) ||
      payment.order_id !== orderId ||
      payment.status !== 'captured' ||
      payment.amount !== order.amount ||
      order.status !== 'paid'
    ) {
      return res.status(400).json({ success: false, message: 'Payment is not captured for this student and order.' });
    }

    const receiptNo = `RCP-${Date.now().toString().slice(-8)}`;
    if (isMongoReady()) {
      const existing = await Fee.findOne({ transactionId: paymentId });
      if (existing) return res.status(409).json({ success: false, message: 'This payment has already been recorded.' });
      const databaseStudent = await User.findById(student._id || student.id);
      if (!databaseStudent) return res.status(404).json({ message: 'Student account was not found.' });
      await Fee.create({
        student: databaseStudent._id,
        amount: payment.amount / 100,
        feeType: 'tuition',
        status: 'paid',
        paidDate: new Date(),
        paymentMethod: 'online',
        transactionId: paymentId,
        receiptNo,
        category: 'Semester Fee Payment',
        email: student.email,
        orderId
      });
    }

    const txnId = paymentId;
    const paidAmount = payment.amount / 100;
    const paidDate = new Date().toISOString();
    const newTxn = {
      txnId,
      orderId,
      date: paidDate.split('T')[0],
      paidAt: paidDate,
      amount: paidAmount,
      method: `Razorpay (${payment.method || 'online'})`,
      category: 'Semester Fee Payment',
      status: 'Success',
      receiptNo,
      studentName: student.name,
      rollNo: student.rollNo || '',
      email: student.email,
      paidBy: req.user.name
    };

    if (!isMongoReady()) {
      const store = getStore();
      store.studentTransactions = store.studentTransactions || [];
      if (store.studentTransactions.some(transaction => transaction.txnId === txnId)) {
        return res.status(409).json({ success: false, message: 'This payment has already been recorded.' });
      }
      store.studentTransactions.unshift(newTxn);
      store.paidFeesByStudent = store.paidFeesByStudent || {};
      const previousPaid = store.paidFeesByStudent[student.email] ??
        (student.email === 'student@school.com' ? Number(store.paidFeesAmount ?? 30000) : 0);
      store.paidFeesByStudent[student.email] = previousPaid + paidAmount;
      writeDB(store);
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified and official receipt generated.',
      transaction: newTxn,
      receipt: {
        receiptNo,
        transactionId: txnId,
        studentName: student.name,
        rollNo: newTxn.rollNo,
        amount: paidAmount,
        currency: 'INR',
        date: paidDate,
        status: 'PAID'
      }
    });
  } catch (error) {
    res.status(502).json({ message: `Could not verify Razorpay payment: ${error.message}` });
  }
});

// Create fee record
router.post('/', async (req, res) => {
  try {
    const feeData = req.body;
    const newFee = new Fee(feeData);
    
    await newFee.save();
    res.status(201).json(newFee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all fees
router.get('/', async (req, res) => {
  try {
    if (isMongoReady()) {
      const fees = await Fee.find().populate('student');
      return res.json(fees);
    }
    const store = getStore();
    return res.json(store.fees || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get fees by student
router.get('/student/:studentId', async (req, res) => {
  try {
    const fees = await Fee.find({ student: req.params.studentId }).populate('student');
    res.json(fees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get pending fees
router.get('/status/pending', async (req, res) => {
  try {
    const fees = await Fee.find({ status: 'pending' }).populate('student');
    res.json(fees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update fee status
router.put('/:id', async (req, res) => {
  try {
    const { status, paidDate, paymentMethod, transactionId } = req.body;
    
    const fee = await Fee.findByIdAndUpdate(
      req.params.id,
      { status, paidDate, paymentMethod, transactionId },
      { new: true }
    );
    
    if (!fee) return res.status(404).json({ message: 'Fee record not found' });
    res.json(fee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete fee record
router.delete('/:id', async (req, res) => {
  try {
    const fee = await Fee.findByIdAndDelete(req.params.id);
    if (!fee) return res.status(404).json({ message: 'Fee record not found' });
    res.json({ message: 'Fee record deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
