const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const { verifyToken } = require('../middleware/authMiddleware');

// Create subject
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, code, teacher, creditHours, description, academicYear } = req.body;
    
    const newSubject = new Subject({
      name,
      code,
      teacher,
      creditHours,
      description,
      academicYear
    });
    
    await newSubject.save();
    res.status(201).json(newSubject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all subjects
router.get('/', async (req, res) => {
  try {
    const subjects = await Subject.find().populate('teacher');
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get subject by ID
router.get('/:id', async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id).populate('teacher');
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update subject
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete subject
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
