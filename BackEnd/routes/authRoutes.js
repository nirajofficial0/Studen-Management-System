const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getStore } = require('../dataStore');
const { writeDB } = require('../database');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { isMongoReady } = require('../config/db');

const router = express.Router();

function sanitizeUser(user) {
  const plainUser = user && user.toObject ? user.toObject() : user;
  const { password, ...safeUser } = plainUser;
  return {
    ...safeUser,
    id: safeUser._id ? safeUser._id.toString() : safeUser.id
  };
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id ? user._id.toString() : user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      rollNo: user.rollNo || '',
      phone: user.phone || ''
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email || '';
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `${name[0]}*@${domain}`;
  return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}@${domain}`;
}

router.post('/register', async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Please fill all required fields' });
  }

  const cleanPhone = phone ? String(phone).trim() : '';

  if (isMongoReady()) {
    try {
      const searchConditions = [{ email: email.toLowerCase() }];
      if (cleanPhone) {
        searchConditions.push({ phone: cleanPhone });
      }

      const existingUser = await User.findOne({ $or: searchConditions });
      if (existingUser) {
        const isPhoneMatch = cleanPhone && existingUser.phone === cleanPhone;
        return res.status(409).json({
          message: isPhoneMatch
            ? 'User with this mobile number already exists'
            : 'User with this email already exists'
        });
      }

      const newUser = await User.create({
        name,
        email: email.toLowerCase(),
        phone: cleanPhone,
        password,
        role
      });

      const token = generateToken(newUser);
      return res.status(201).json({
        message: 'Registration successful',
        user: sanitizeUser(newUser),
        token
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || 'Registration failed' });
    }
  }

  const store = getStore();
  const exists = store.users.some(
    user =>
      user.email.toLowerCase() === email.toLowerCase() ||
      (cleanPhone && user.phone && String(user.phone).trim() === cleanPhone)
  );

  if (exists) {
    return res.status(409).json({ message: 'User with this email or mobile number already exists' });
  }

  const newUser = {
    id: Date.now(),
    name,
    email,
    phone: cleanPhone,
    password,
    role
  };

  store.users.push(newUser);
  writeDB(store);

  const token = generateToken(newUser);
  return res.status(201).json({
    message: 'Registration successful',
    user: sanitizeUser(newUser),
    token
  });
});

router.post('/login', async (req, res) => {
  const { email, identifier, password } = req.body;
  const loginId = (identifier || email || '').toString().trim();

  if (!loginId || !password) {
    return res.status(400).json({ message: 'Email/Mobile Number and password are required' });
  }

  if (isMongoReady()) {
    try {
      const user = await User.findOne({
        $or: [
          { email: loginId.toLowerCase() },
          { phone: loginId }
        ]
      });

      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid email/mobile number or password' });
      }

      const token = generateToken(user);
      return res.status(200).json({
        message: 'Login successful',
        user: sanitizeUser(user),
        token
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || 'Login failed' });
    }
  }

  const store = getStore();
  const user = store.users.find(
    item =>
      (item.email.toLowerCase() === loginId.toLowerCase() ||
       (item.phone && String(item.phone).trim() === loginId)) &&
      item.password === password
  );

  if (!user) {
    return res.status(401).json({ message: 'Invalid email/mobile number or password' });
  }

  const token = generateToken(user);
  return res.status(200).json({
    message: 'Login successful',
    user: sanitizeUser(user),
    token
  });
});

router.post('/verify-phone', async (req, res) => {
  const { phone, role } = req.body;
  const cleanPhone = (phone || '').toString().trim();

  if (!cleanPhone) {
    return res.status(400).json({ message: 'Mobile number is required' });
  }

  if (isMongoReady()) {
    try {
      const query = { phone: cleanPhone };
      if (role && role !== 'all') query.role = role;

      const user = await User.findOne(query);
      if (!user) {
        return res.status(404).json({ message: 'No registered user found with this mobile number' });
      }

      return res.status(200).json({
        exists: true,
        name: user.name,
        role: user.role,
        maskedEmail: maskEmail(user.email)
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || 'Verification failed' });
    }
  }

  const store = getStore();
  const user = store.users.find(
    item =>
      item.phone &&
      String(item.phone).trim() === cleanPhone &&
      (!role || role === 'all' || item.role === role)
  );

  if (!user) {
    return res.status(404).json({ message: 'No registered user found with this mobile number' });
  }

  return res.status(200).json({
    exists: true,
    name: user.name,
    role: user.role,
    maskedEmail: maskEmail(user.email)
  });
});

router.post('/forgot-password', async (req, res) => {
  const { phone, email, role, newPassword } = req.body;
  const cleanPhone = (phone || '').toString().trim();
  const cleanEmail = (email || '').toString().trim().toLowerCase();

  if ((!cleanPhone && !cleanEmail) || !newPassword) {
    return res.status(400).json({ message: 'Mobile number (or email) and new password are required' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ message: 'Password must be at least 4 characters long' });
  }

  if (isMongoReady()) {
    try {
      const query = {};
      if (cleanPhone) {
        query.phone = cleanPhone;
      } else if (cleanEmail) {
        query.email = cleanEmail;
      }

      if (role && role !== 'all') {
        query.role = role;
      }

      const user = await User.findOne(query);
      if (!user) {
        return res.status(404).json({
          message: 'User account not found with the provided details'
        });
      }

      user.password = newPassword;
      await user.save();

      return res.status(200).json({
        message: 'Password reset successfully! You can now log in with your new password.',
        user: sanitizeUser(user)
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || 'Password reset failed' });
    }
  }

  const store = getStore();
  const userIndex = store.users.findIndex(item => {
    const matchesPhone = cleanPhone && item.phone && String(item.phone).trim() === cleanPhone;
    const matchesEmail = cleanEmail && item.email.toLowerCase() === cleanEmail;
    const matchesRole = !role || role === 'all' || item.role === role;
    return (matchesPhone || matchesEmail) && matchesRole;
  });

  if (userIndex === -1) {
    return res.status(404).json({
      message: 'User account not found with the provided details'
    });
  }

  store.users[userIndex].password = newPassword;
  writeDB(store);

  return res.status(200).json({
    message: 'Password reset successfully! You can now log in with your new password.',
    user: sanitizeUser(store.users[userIndex])
  });
});

module.exports = router;
