const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');
const User = require('../models/User');
const Fee = require('../models/Fee');
const Class = require('../models/Class');
const { verifyToken } = require('../middleware/authMiddleware');

// Get attendance statistics
router.get('/attendance/stats/:classId', async (req, res) => {
  try {
    const attendance = await Attendance.find({ class: req.params.classId });
    
    const totalClasses = attendance.length;
    const stats = {};
    
    attendance.forEach(record => {
      const studentId = record.student.toString();
      if (!stats[studentId]) {
        stats[studentId] = { present: 0, absent: 0, total: 0 };
      }
      stats[studentId].total++;
      if (record.status === 'present') {
        stats[studentId].present++;
      } else {
        stats[studentId].absent++;
      }
    });
    
    // Calculate percentages
    Object.keys(stats).forEach(studentId => {
      stats[studentId].percentage = (stats[studentId].present / stats[studentId].total * 100).toFixed(2);
    });
    
    res.json({ totalClasses, statistics: stats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get marks statistics
router.get('/marks/stats/:classId', async (req, res) => {
  try {
    const marks = await Marks.find()
      .populate({ path: 'student', match: { class: req.params.classId } });
    
    const stats = {
      totalStudents: marks.length,
      averageMarks: 0,
      highestMarks: 0,
      lowestMarks: 100,
      distribution: {
        excellent: 0,
        good: 0,
        average: 0,
        poor: 0
      }
    };
    
    let totalMarks = 0;
    
    marks.forEach(mark => {
      const marksObtained = mark.marksObtained;
      totalMarks += marksObtained;
      
      if (marksObtained > stats.highestMarks) stats.highestMarks = marksObtained;
      if (marksObtained < stats.lowestMarks) stats.lowestMarks = marksObtained;
      
      if (marksObtained >= 80) stats.distribution.excellent++;
      else if (marksObtained >= 60) stats.distribution.good++;
      else if (marksObtained >= 40) stats.distribution.average++;
      else stats.distribution.poor++;
    });
    
    stats.averageMarks = (totalMarks / marks.length).toFixed(2);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get fee statistics
router.get('/fees/stats/:classId', async (req, res) => {
  try {
    const classData = await Class.findById(req.params.classId).populate('students');
    const fees = await Fee.find();
    
    const stats = {
      totalStudents: classData.students.length,
      totalFeeCollected: 0,
      pendingFees: 0,
      feeStatus: {
        paid: 0,
        pending: 0,
        overdue: 0
      }
    };
    
    classData.students.forEach(student => {
      const studentFees = fees.filter(f => f.student.toString() === student._id.toString());
      
      studentFees.forEach(fee => {
        if (fee.status === 'paid') {
          stats.totalFeeCollected += fee.amount;
          stats.feeStatus.paid++;
        } else if (fee.status === 'pending') {
          stats.pendingFees += fee.amount;
          stats.feeStatus.pending++;
        } else if (fee.status === 'overdue') {
          stats.feeStatus.overdue++;
        }
      });
    });
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get overall dashboard stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalClasses = await Class.countDocuments();
    
    const fees = await Fee.find();
    const totalFeeCollected = fees
      .filter(f => f.status === 'paid')
      .reduce((sum, f) => sum + f.amount, 0);
    
    const pendingFees = fees
      .filter(f => f.status === 'pending')
      .reduce((sum, f) => sum + f.amount, 0);
    
    res.json({
      totalUsers,
      totalStudents,
      totalTeachers,
      totalClasses,
      totalFeeCollected,
      pendingFees
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Generate attendance report
router.get('/report/attendance/:classId', async (req, res) => {
  try {
    const classData = await Class.findById(req.params.classId)
      .populate('students');
    
    const attendanceReport = [];
    
    for (let student of classData.students) {
      const attendance = await Attendance.find({ student: student._id });
      const totalClasses = attendance.length;
      const presentDays = attendance.filter(a => a.status === 'present').length;
      const percentage = totalClasses > 0 ? (presentDays / totalClasses * 100).toFixed(2) : 0;
      
      attendanceReport.push({
        studentName: student.name,
        email: student.email,
        totalClasses,
        presentDays,
        absentDays: totalClasses - presentDays,
        percentage
      });
    }
    
    res.json(attendanceReport);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Generate marks report
router.get('/report/marks/:classId', async (req, res) => {
  try {
    const classData = await Class.findById(req.params.classId)
      .populate('students');
    
    const marksReport = [];
    
    for (let student of classData.students) {
      const marks = await Marks.find({ student: student._id }).populate('subject');
      
      let totalMarks = 0;
      let subjects = [];
      
      marks.forEach(mark => {
        totalMarks += mark.marksObtained;
        subjects.push({
          subjectName: mark.subject.name,
          marksObtained: mark.marksObtained,
          totalMarks: mark.totalMarks,
          grade: mark.grade
        });
      });
      
      marksReport.push({
        studentName: student.name,
        email: student.email,
        totalMarks,
        averageMarks: marks.length > 0 ? (totalMarks / marks.length).toFixed(2) : 0,
        subjects
      });
    }
    
    res.json(marksReport);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
