const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const authRoutes = require('../routes/authRoutes');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

test('Auth flow: register with phone, login with phone/email, and forgot-password with phone', async () => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/auth`;

  try {
    // 1. Test Login with Demo Admin phone
    const loginPhoneRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '9876543210', password: 'admin123' })
    });
    assert.equal(loginPhoneRes.status, 200, 'Login with phone should succeed');
    const loginPhoneData = await loginPhoneRes.json();
    assert.equal(loginPhoneData.user.role, 'admin');

    // 2. Test Login with Demo Admin email
    const loginEmailRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@school.com', password: 'admin123' })
    });
    assert.equal(loginEmailRes.status, 200, 'Login with email should succeed');

    // 3. Test Register new user with phone
    const testPhone = '9' + String(Date.now()).slice(-9);
    const testEmail = `testuser_${Date.now()}@school.com`;
    const regRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Mobile User',
        email: testEmail,
        phone: testPhone,
        password: 'initialpassword123',
        role: 'student'
      })
    });
    assert.equal(regRes.status, 201, 'Registration with phone should succeed');
    const regData = await regRes.json();
    assert.equal(regData.user.phone, testPhone);

    // 4. Test Verify Phone
    const verifyRes = await fetch(`${baseUrl}/verify-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, role: 'student' })
    });
    assert.equal(verifyRes.status, 200, 'Verify phone should succeed');
    const verifyData = await verifyRes.json();
    assert.equal(verifyData.exists, true);
    assert.equal(verifyData.name, 'Test Mobile User');

    // 5. Test Forgot Password using Phone
    const forgotRes = await fetch(`${baseUrl}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone,
        role: 'student',
        newPassword: 'newsecurepassword456'
      })
    });
    assert.equal(forgotRes.status, 200, 'Forgot password with phone should succeed');

    // 6. Test Login with new password using phone
    const reLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testPhone, password: 'newsecurepassword456' })
    });
    assert.equal(reLoginRes.status, 200, 'Login with updated password should succeed');

    // Cleanup store test user
    const { getStore } = require('../dataStore');
    const { writeDB } = require('../database');
    const store = getStore();
    const idx = store.users.findIndex(u => u.phone === testPhone);
    if (idx !== -1) {
      store.users.splice(idx, 1);
      writeDB(store);
    }

    console.log('All auth tests passed successfully!');
  } finally {
    server.close();
  }
});
