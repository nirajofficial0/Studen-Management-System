const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { verifyToken } = require('../middleware/authMiddleware');

// Send message
router.post('/', verifyToken, async (req, res) => {
  try {
    const { sender, recipient, subject, message, attachments } = req.body;
    
    const newMessage = new Message({
      sender,
      recipient,
      subject,
      message,
      attachments
    });
    
    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get messages for user (inbox)
router.get('/inbox/:userId', async (req, res) => {
  try {
    const messages = await Message.find({ recipient: req.params.userId })
      .populate('sender')
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get sent messages
router.get('/sent/:userId', async (req, res) => {
  try {
    const messages = await Message.find({ sender: req.params.userId })
      .populate('recipient')
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get conversation between two users
router.get('/conversation/:userId/:otherUserId', async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.params.userId, recipient: req.params.otherUserId },
        { sender: req.params.otherUserId, recipient: req.params.userId }
      ]
    })
      .populate('sender')
      .populate('recipient')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark message as read
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    
    if (!message) return res.status(404).json({ message: 'Message not found' });
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete message
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
