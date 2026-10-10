const express = require('express');
const router = express.Router();
const Timetable = require('../models/Timetable');
const { verifyToken } = require('../middleware/authMiddleware');

// Create timetable entry
router.post('/', verifyToken, async (req, res) => {
  try {
    const timetableData = req.body;
    const newTimetable = new Timetable(timetableData);
    
    await newTimetable.save();
    res.status(201).json(newTimetable);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get timetable by class
router.get('/class/:classId', async (req, res) => {
  try {
    const timetable = await Timetable.find({ class: req.params.classId })
      .populate('subject')
      .populate('teacher')
      .populate('class');
    res.json(timetable);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get timetable by day
router.get('/day/:day', async (req, res) => {
  try {
    const timetable = await Timetable.find({ day: req.params.day })
      .populate('subject')
      .populate('teacher')
      .populate('class');
    res.json(timetable);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all timetables
router.get('/', async (req, res) => {
  try {
    const timetable = await Timetable.find()
      .populate('subject')
      .populate('teacher')
      .populate('class');
    res.json(timetable);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update timetable
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const timetable = await Timetable.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!timetable) return res.status(404).json({ message: 'Timetable entry not found' });
    res.json(timetable);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete timetable
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const timetable = await Timetable.findByIdAndDelete(req.params.id);
    if (!timetable) return res.status(404).json({ message: 'Timetable entry not found' });
    res.json({ message: 'Timetable entry deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
