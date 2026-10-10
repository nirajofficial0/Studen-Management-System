const nodemailer = require('nodemailer');

// Configure email service
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Email templates
const emailTemplates = {
  welcomeStudent: (name, studentId) => ({
    subject: 'Welcome to School Management System',
    html: `
      <h2>Welcome ${name}!</h2>
      <p>You have been registered in our School Management System.</p>
      <p><strong>Student ID:</strong> ${studentId}</p>
      <p>You can now login to your account and view your attendance, marks, and other important information.</p>
      <p>Best regards,<br/>School Management Team</p>
    `
  }),

  attendanceAlert: (studentName, date, status) => ({
    subject: `Attendance Alert - ${date}`,
    html: `
      <h2>Attendance Notification</h2>
      <p>Dear Parent/Guardian,</p>
      <p><strong>${studentName}</strong> was marked <strong>${status.toUpperCase()}</strong> on <strong>${date}</strong>.</p>
      <p>For more details, please login to the parent portal.</p>
      <p>Best regards,<br/>School Management Team</p>
    `
  }),

  marksNotification: (studentName, subject, marks, totalMarks) => ({
    subject: `Marks Update - ${subject}`,
    html: `
      <h2>Marks Notification</h2>
      <p>Dear Parent/Guardian,</p>
      <p><strong>${studentName}</strong> has received marks for <strong>${subject}</strong>.</p>
      <p><strong>Marks Obtained:</strong> ${marks}/${totalMarks}</p>
      <p>For more details, please login to the parent portal.</p>
      <p>Best regards,<br/>School Management Team</p>
    `
  }),

  feeReminder: (studentName, amount, dueDate) => ({
    subject: 'Fee Payment Reminder',
    html: `
      <h2>Fee Payment Reminder</h2>
      <p>Dear Parent/Guardian,</p>
      <p>This is a reminder that the fee payment for <strong>${studentName}</strong> is due by <strong>${dueDate}</strong>.</p>
      <p><strong>Amount Due:</strong> ₹${amount}</p>
      <p>Please pay the fee to avoid any late charges.</p>
      <p>Best regards,<br/>School Management Team</p>
    `
  }),

  examNotification: (studentName, examName, date, time) => ({
    subject: `Exam Alert - ${examName}`,
    html: `
      <h2>Exam Notification</h2>
      <p>Dear Student/Parent,</p>
      <p><strong>${examName}</strong> is scheduled on <strong>${date}</strong> at <strong>${time}</strong>.</p>
      <p>Please ensure that ${studentName} is present on time.</p>
      <p>For more details, please check the exam schedule in your account.</p>
      <p>Best regards,<br/>School Management Team</p>
    `
  }),

  noticeAlert: (title, message) => ({
    subject: `Notice - ${title}`,
    html: `
      <h2>School Notice</h2>
      <p><strong>${title}</strong></p>
      <p>${message}</p>
      <p>For more details, please login to your account.</p>
      <p>Best regards,<br/>School Management Team</p>
    `
  })
};

// Send email function
const sendEmail = async (toEmail, templateName, data) => {
  try {
    const template = emailTemplates[templateName];
    if (!template) {
      console.error(`Email template '${templateName}' not found`);
      return false;
    }

    const emailContent = template(...Object.values(data));
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: toEmail,
      ...emailContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Bulk email sender
const sendBulkEmails = async (recipients, templateName, data) => {
  const results = [];
  
  for (const email of recipients) {
    const result = await sendEmail(email, templateName, data);
    results.push({ email, sent: result });
  }

  return results;
};

module.exports = {
  sendEmail,
  sendBulkEmails,
  emailTemplates
};
