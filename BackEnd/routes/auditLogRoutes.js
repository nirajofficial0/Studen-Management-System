const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { verifyToken } = require('../middleware/authMiddleware');

// Create audit log
router.post('/', verifyToken, async (req, res) => {
  try {
    const { user, action, module, description, changes, ipAddress, userAgent } = req.body;
    
    const newLog = new AuditLog({
      user,
      action,
      module,
      description,
      changes,
      ipAddress,
      userAgent
    });
    
    await newLog.save();
    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get audit logs
router.get('/', async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('user')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get audit logs by user
router.get('/user/:userId', async (req, res) => {
  try {
    const logs = await AuditLog.find({ user: req.params.userId })
      .populate('user')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get audit logs by module
router.get('/module/:module', async (req, res) => {
  try {
    const logs = await AuditLog.find({ module: req.params.module })
      .populate('user')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
