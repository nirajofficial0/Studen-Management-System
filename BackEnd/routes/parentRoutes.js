const express = require('express');
const router = express.Router();
const Parent = require('../models/Parent');
const { verifyToken } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');

// Register parent
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, relationship, child } = req.body;
    
    // Check if parent already exists
    const existingParent = await Parent.findOne({ email });
    if (existingParent) return res.status(400).json({ message: 'Parent already registered' });
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newParent = new Parent({
      name,
      email,
      password: hashedPassword,
      phone,
      relationship,
      child
    });
    
    await newParent.save();
    res.status(201).json({ message: 'Parent registered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all parents
router.get('/', async (req, res) => {
  try {
    const parents = await Parent.find().populate('child');
    res.json(parents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get parent by ID
router.get('/:id', async (req, res) => {
  try {
    const parent = await Parent.findById(req.params.id).populate('child');
    if (!parent) return res.status(404).json({ message: 'Parent not found' });
    res.json(parent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update parent
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const parent = await Parent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!parent) return res.status(404).json({ message: 'Parent not found' });
    res.json(parent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete parent
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const parent = await Parent.findByIdAndDelete(req.params.id);
    if (!parent) return res.status(404).json({ message: 'Parent not found' });
    res.json({ message: 'Parent deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
