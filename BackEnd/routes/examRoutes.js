const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const { verifyToken } = require('../middleware/authMiddleware');

// Create exam
router.post('/', verifyToken, async (req, res) => {
  try {
    const examData = req.body;
    const newExam = new Exam(examData);
    
    await newExam.save();
    res.status(201).json(newExam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all exams
router.get('/', async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate('subject')
      .populate('class');
    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get exam by ID
router.get('/:id', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('subject')
      .populate('class');
    
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get exams by class
router.get('/class/:classId', async (req, res) => {
  try {
    const exams = await Exam.find({ class: req.params.classId })
      .populate('subject')
      .populate('class');
    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update exam
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete exam
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json({ message: 'Exam deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
