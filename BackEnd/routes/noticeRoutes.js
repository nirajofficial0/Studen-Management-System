const express = require('express');
const Notice = require('../models/Notice');
const { getStore } = require('../dataStore');
const { writeDB } = require('../database');
const { verifyToken } = require('../middleware/authMiddleware');
const { isMongoReady } = require('../config/db');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  if (isMongoReady()) {
    const notices = await Notice.find().sort({ createdAt: -1 }).lean();
    return res.json(notices.map(notice => ({
      ...notice,
      id: notice._id ? notice._id.toString() : notice.id,
      createdBy: notice.createdBy ? notice.createdBy.toString() : null
    })));
  }

  const store = getStore();
  return res.json(store.notices);
});

router.post('/', verifyToken, async (req, res) => {
  const { title, message } = req.body;

  if (!title || !message) {
    return res.status(400).json({ message: 'Title and message are required' });
  }

  if (isMongoReady()) {
    const newNotice = await Notice.create({
      title,
      message,
      createdBy: req.user.id
    });

    const formattedNotice = {
      ...newNotice.toObject(),
      id: newNotice._id.toString(),
      createdBy: newNotice.createdBy.toString()
    };

    const io = req.app.get('io');
    if (io) io.emit('notice_published', formattedNotice);

    return res.status(201).json({
      message: 'Notice created',
      notice: formattedNotice
    });
  }

  const store = getStore();
  const newNotice = {
    id: Date.now(),
    title,
    message,
    date: new Date().toISOString()
  };

  store.notices.unshift(newNotice);
  writeDB(store);

  const io = req.app.get('io');
  if (io) io.emit('notice_published', newNotice);

  return res.status(201).json({ message: 'Notice created', notice: newNotice });
});

module.exports = router;
