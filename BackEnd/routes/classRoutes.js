const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const { verifyToken } = require('../middleware/authMiddleware');

// Create class
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, section, classTeacher, academicYear } = req.body;
    
    const newClass = new Class({
      name,
      section,
      classTeacher,
      academicYear
    });
    
    await newClass.save();
    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all classes
router.get('/', async (req, res) => {
  try {
    const classes = await Class.find()
      .populate('classTeacher')
      .populate('students')
      .populate('subjects');
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get class by ID
router.get('/:id', async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate('classTeacher')
      .populate('students')
      .populate('subjects');
    
    if (!classData) return res.status(404).json({ message: 'Class not found' });
    res.json(classData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update class
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const classData = await Class.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!classData) return res.status(404).json({ message: 'Class not found' });
    res.json(classData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete class
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const classData = await Class.findByIdAndDelete(req.params.id);
    if (!classData) return res.status(404).json({ message: 'Class not found' });
    res.json({ message: 'Class deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add student to class
router.post('/:id/addStudent/:studentId', verifyToken, async (req, res) => {
  try {
    const classData = await Class.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { students: req.params.studentId } },
      { new: true }
    );
    res.json(classData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
