const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail } = require('./emailService');

// Create notification and send email
const createNotificationWithEmail = async (userId, title, message, type, email = null) => {
  try {
    // Create notification in database
    const notification = new Notification({
      user: userId,
      title,
      message,
      type
    });

    await notification.save();

    // Send email if email provided
    if (email) {
      try {
        await sendEmail(email, 'noticeAlert', [title, message]);
      } catch (error) {
        console.error('Error sending email:', error);
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Send attendance notification to parent
const sendAttendanceNotification = async (studentId, date, status) => {
  try {
    const student = await User.findById(studentId);
    if (!student) return;

    // Create notification for student
    await createNotificationWithEmail(
      studentId,
      'Attendance Marked',
      `Your attendance has been marked as ${status} on ${date}`,
      'attendance',
      student.email
    );

    // TODO: Send email to parent if parent email is available
  } catch (error) {
    console.error('Error sending attendance notification:', error);
  }
};

// Send marks notification
const sendMarksNotification = async (studentId, subject, marks, totalMarks) => {
  try {
    const student = await User.findById(studentId);
    if (!student) return;

    const percentage = ((marks / totalMarks) * 100).toFixed(2);

    await createNotificationWithEmail(
      studentId,
      'Marks Updated',
      `Your marks for ${subject}: ${marks}/${totalMarks} (${percentage}%)`,
      'marks',
      student.email
    );
  } catch (error) {
    console.error('Error sending marks notification:', error);
  }
};

// Send fee reminder
const sendFeeReminder = async (studentId, amount, dueDate) => {
  try {
    const student = await User.findById(studentId);
    if (!student) return;

    await createNotificationWithEmail(
      studentId,
      'Fee Payment Reminder',
      `Fee of ₹${amount} is due by ${dueDate}`,
      'fee',
      student.email
    );
  } catch (error) {
    console.error('Error sending fee reminder:', error);
  }
};

// Send exam notification
const sendExamNotification = async (studentId, examName, date, time) => {
  try {
    const student = await User.findById(studentId);
    if (!student) return;

    await createNotificationWithEmail(
      studentId,
      'Exam Scheduled',
      `${examName} is scheduled on ${date} at ${time}`,
      'exam',
      student.email
    );
  } catch (error) {
    console.error('Error sending exam notification:', error);
  }
};

// Send notice to all users
const sendNoticeToAll = async (title, message, targetRole = null) => {
  try {
    const query = targetRole ? { role: targetRole } : {};
    const users = await User.find(query);

    for (const user of users) {
      await createNotificationWithEmail(
        user._id,
        title,
        message,
        'general',
        user.email
      );
    }

    return { success: true, usersNotified: users.length };
  } catch (error) {
    console.error('Error sending notice:', error);
    throw error;
  }
};

module.exports = {
  createNotificationWithEmail,
  sendAttendanceNotification,
  sendMarksNotification,
  sendFeeReminder,
  sendExamNotification,
  sendNoticeToAll
};
