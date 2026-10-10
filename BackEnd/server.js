require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middleware/authMiddleware');

const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const marksRoutes = require('./routes/marksRoutes');
const classRoutes = require('./routes/classRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const examRoutes = require('./routes/examRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const parentRoutes = require('./routes/parentRoutes');
const feeRoutes = require('./routes/feeRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const studentRoutes = require('./routes/studentRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 5001;
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const isAllowedOrigin = origin =>
  !origin ||
  process.env.NODE_ENV !== 'production' ||
  allowedOrigins.includes(origin);

// Initialize HTTP server & Socket.io for Real-time WebSockets
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by FRONTEND_URL.'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    next(new Error('Invalid or expired token'));
  }
});

// Attach io instance to express app
app.set('io', io);

// Serve static uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by FRONTEND_URL.'));
  }
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'School Management Backend with Real-Time WebSockets is running',
    version: '2.0.0',
    features: [
      'Razorpay Checkout with server-side signature verification (requires Razorpay test keys)',
      'Client-side PDF report cards and verified payment receipts',
      'CSV/XLSX student and marks bulk import (up to 100 rows)',
      'Multer uploads to Cloudinary (requires Cloudinary credentials)',
      'Authenticated Socket.io doubts, chat relay, and announcements',
      'Chart.js teacher attendance and marks analytics'
    ],
    endpoints: [
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/verify-phone',
      '/api/auth/forgot-password',
      '/api/student/dashboard',
      '/api/student/profile',
      '/api/student/courses',
      '/api/student/marks',
      '/api/student/timetable',
      '/api/student/assignments',
      '/api/student/exams',
      '/api/student/fees',
      '/api/student/study-materials',
      '/api/student/doubts',
      '/api/student/leaves',
      '/api/student/documents',
      '/api/student/feedback',
      '/api/users',
      '/api/users/sample-csv',
      '/api/users/bulk-upload',
      '/api/upload/assignment',
      '/api/upload/document',
      '/api/upload/material',
      '/api/fees/create-razorpay-order',
      '/api/fees/verify-payment',
      '/api/notices',
      '/api/attendance',
      '/api/marks',
      '/api/marks/bulk-upload',
      '/api/classes',
      '/api/subjects',
      '/api/exams',
      '/api/timetable',
      '/api/parents',
      '/api/fees',
      '/api/messages',
      '/api/notifications',
      '/api/auditlogs',
      '/api/analytics'
    ]
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/auditlogs', auditLogRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);

// Socket.io Real-Time Event Handlers
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  socket.join(`user:${socket.user.id}`);
  socket.join(`role:${socket.user.role}`);

  socket.on('send_message', (data) => {
    if (!data || !data.recipientId || !String(data.message || '').trim()) return;
    io.to(`user:${data.recipientId}`).emit('receive_message', {
      senderId: socket.user.id,
      senderName: socket.user.name,
      message: String(data.message).slice(0, 5000),
      sentAt: new Date().toISOString()
    });
  });

  socket.on('new_doubt', (doubtData) => {
    if (socket.user.role !== 'student' || !doubtData || !String(doubtData.question || '').trim()) return;
    io.to('role:teacher').emit('doubt_received', {
      ...doubtData,
      studentId: socket.user.id,
      studentName: socket.user.name,
      question: String(doubtData.question).slice(0, 5000),
      subject: String(doubtData.subject || 'General').slice(0, 100)
    });
  });

  socket.on('reply_doubt', (replyData) => {
    if (!['teacher', 'admin'].includes(socket.user.role) || !replyData || !replyData.studentId) return;
    io.to(`user:${replyData.studentId}`).emit('doubt_answered', {
      id: replyData.id,
      reply: String(replyData.reply || '').slice(0, 5000),
      teacherName: socket.user.name
    });
  });

  socket.on('broadcast_notice', (noticeData) => {
    if (!['teacher', 'admin'].includes(socket.user.role) || !noticeData) return;
    io.emit('notice_published', {
      title: String(noticeData.title || '').slice(0, 200),
      message: String(noticeData.message || '').slice(0, 5000),
      createdAt: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

async function startServer() {
  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'school-secret-key')
  ) {
    throw new Error('Set JWT_SECRET to a unique random value with at least 32 characters in production.');
  }
  await connectDB();
  server.listen(PORT, () => {
    console.log(`Server running with WebSockets on http://localhost:${PORT}`);
  });
}

startServer().catch(error => {
  console.error('Server startup failed:', error.message);
  process.exitCode = 1;
});
