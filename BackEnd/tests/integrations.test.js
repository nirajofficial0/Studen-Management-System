const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const feeRoutes = require('../routes/feeRoutes');
const uploadRoutes = require('../routes/uploadRoutes');
const marksRoutes = require('../routes/marksRoutes');
const studentRoutes = require('../routes/studentRoutes');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { connectDB } = require('../config/db');

test('Production refuses to start without a MongoDB URI', async () => {
  const previousMode = process.env.NODE_ENV;
  const previousMongoUri = process.env.MONGO_URI;
  process.env.NODE_ENV = 'production';
  delete process.env.MONGO_URI;
  try {
    await assert.rejects(connectDB(), /MONGO_URI is required in production/);
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
    if (previousMongoUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = previousMongoUri;
  }
});

test('Payment, upload, bulk import, and doubt endpoints enforce their expected guards', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/fees', feeRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/marks', marksRoutes);
  app.use('/api/student', studentRoutes);
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const studentToken = jwt.sign(
    { id: 'student-1', email: 'student@school.com', name: 'Student One', role: 'student' },
    JWT_SECRET
  );

  try {
    const orderWithoutAuth = await fetch(`${baseUrl}/fees/create-razorpay-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100 })
    });
    assert.equal(orderWithoutAuth.status, 401);

    const feesWithoutAuth = await fetch(`${baseUrl}/student/fees`);
    assert.equal(feesWithoutAuth.status, 401);

    const badVerification = await fetch(`${baseUrl}/fees/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({})
    });
    assert.equal(badVerification.status, 400);

    const unauthenticatedUpload = await fetch(`${baseUrl}/upload/assignment`, {
      method: 'POST'
    });
    assert.equal(unauthenticatedUpload.status, 401);

    const unauthenticatedImport = await fetch(`${baseUrl}/marks/bulk-upload`, {
      method: 'POST'
    });
    assert.equal(unauthenticatedImport.status, 401);

    const simulatedPayment = await fetch(`${baseUrl}/student/fees/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100 })
    });
    assert.equal(simulatedPayment.status, 410);

    const doubtWithoutAuth = await fetch(`${baseUrl}/student/doubts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: 'Math', question: 'How do I solve this?' })
    });
    assert.equal(doubtWithoutAuth.status, 401);
  } finally {
    server.close();
  }
});
