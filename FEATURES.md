# School Management System - Complete Feature Documentation

## Overview
This is a comprehensive School Management System with advanced features for students, teachers, parents, and administrators.

## ✨ New Features Added

### 1. **Class Management**
- **Frontend**: `admin/manage-classes.html`
- **API**: `/api/classes`
- **Features**:
  - Create and manage classes
  - Assign class teachers
  - Add students to classes
  - Manage subjects per class
  - Track academic year

### 2. **Subject Management**
- **API**: `/api/subjects`
- **Features**:
  - Create subjects with codes
  - Assign teachers to subjects
  - Track credit hours
  - Manage academic year

### 3. **Exam Management**
- **Frontend**: `admin/manage-exams.html`, `student/exams.html`
- **API**: `/api/exams`
- **Features**:
  - Schedule exams with dates and times
  - Set exam duration and total marks
  - Define exam locations
  - Track exam status (upcoming, ongoing, completed)
  - Add exam instructions

### 4. **Timetable Management**
- **Frontend**: `student/timetable.html`
- **API**: `/api/timetable`
- **Features**:
  - Create class timetables
  - Organize by days and time slots
  - Assign teachers and rooms
  - View timetable by class or day

### 5. **Parent Portal**
- **Frontend**: `parent/dashboard.html`
- **Features**:
  - View child's attendance
  - Check marks and performance
  - Monitor fee status
  - View upcoming exams
  - See school announcements
  - Performance analytics with charts

### 6. **Fee Management**
- **Frontend**: `admin/manage-fees.html`, `student/fees.html`
- **API**: `/api/fees`
- **Features**:
  - Create fee records for students
  - Track fee status (paid, pending, overdue)
  - Record payment methods
  - Store transaction IDs
  - Generate fee statistics
  - Send fee reminders via email

### 7. **Messaging System**
- **Frontend**: `messages.html`
- **API**: `/api/messages`
- **Features**:
  - Send messages between users
  - View conversations
  - Mark messages as read
  - Delete messages
  - Attach files to messages

### 8. **Notifications System**
- **Frontend**: `notifications.html`
- **API**: `/api/notifications`
- **Features**:
  - Real-time notifications
  - Filter by type (exam, attendance, marks, fee)
  - Mark as read/unread
  - Email notifications
  - Bulk notifications to users

### 9. **Analytics & Reporting**
- **Frontend**: `admin/analytics.html`, `admin/reports.html`
- **API**: `/api/analytics`
- **Features**:
  - Dashboard with key metrics
  - Attendance statistics
  - Marks distribution
  - Fee collection reports
  - Performance charts
  - Generate downloadable reports

### 10. **Enhanced Security**
- **Middleware**: 
  - Role-based access control (`roleMiddleware.js`)
  - Two-factor authentication (`twoFactorAuth.js`)
  - Audit logging (`auditMiddleware.js`)
- **Features**:
  - 2FA support for secure login
  - Activity audit trail
  - Role-based permissions

### 11. **Email Notifications**
- **Service**: `emailService.js`, `notificationService.js`
- **Features**:
  - Welcome emails for new students
  - Attendance alerts
  - Marks notifications
  - Fee reminders
  - Exam notifications
  - General announcements

### 12. **Audit Logging**
- **API**: `/api/auditlogs`
- **Features**:
  - Track all user activities
  - Log module changes
  - Record IP addresses
  - Store browser information

## 📁 Project Structure

```
BackEnd/
├── models/               # MongoDB Models
│   ├── User.js
│   ├── Class.js
│   ├── Subject.js
│   ├── Exam.js
│   ├── Timetable.js
│   ├── Parent.js
│   ├── Fee.js
│   ├── Message.js
│   ├── Notification.js
│   └── AuditLog.js
├── routes/               # API Routes
│   ├── classRoutes.js
│   ├── subjectRoutes.js
│   ├── examRoutes.js
│   ├── timetableRoutes.js
│   ├── parentRoutes.js
│   ├── feeRoutes.js
│   ├── messageRoutes.js
│   ├── notificationRoutes.js
│   ├── analyticsRoutes.js
│   └── auditLogRoutes.js
├── middleware/           # Custom Middleware
│   ├── authMiddleware.js
│   ├── roleMiddleware.js
│   ├── twoFactorAuth.js
│   └── auditMiddleware.js
├── services/             # Business Logic
│   ├── emailService.js
│   └── notificationService.js
└── server.js            # Main Server File

FrontEnd/
├── admin/
│   ├── dashboard.html
│   ├── manage-users.html
│   ├── manage-classes.html
│   ├── manage-fees.html
│   ├── manage-exams.html
│   ├── analytics.html
│   └── reports.html
├── student/
│   ├── dashboard.html
│   ├── attendance.html
│   ├── marks.html
│   ├── timetable.html
│   ├── exams.html
│   └── fees.html
├── teacher/
│   ├── dashboard.html
│   ├── manage_attendance.html
│   └── manage-marks.html
├── parent/
│   └── dashboard.html
├── messages.html
├── notifications.html
├── index.html
├── register.html
├── css/
│   └── style.css
└── js/
    └── script.js
```

## 🔌 API Endpoints

### Classes
- `POST /api/classes` - Create class
- `GET /api/classes` - Get all classes
- `GET /api/classes/:id` - Get class details
- `PUT /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Delete class
- `POST /api/classes/:id/addStudent/:studentId` - Add student

### Subjects
- `POST /api/subjects` - Create subject
- `GET /api/subjects` - Get all subjects
- `GET /api/subjects/:id` - Get subject details
- `PUT /api/subjects/:id` - Update subject
- `DELETE /api/subjects/:id` - Delete subject

### Exams
- `POST /api/exams` - Schedule exam
- `GET /api/exams` - Get all exams
- `GET /api/exams/:id` - Get exam details
- `GET /api/exams/class/:classId` - Get exams by class
- `PUT /api/exams/:id` - Update exam
- `DELETE /api/exams/:id` - Cancel exam

### Timetable
- `POST /api/timetable` - Create timetable entry
- `GET /api/timetable` - Get all timetables
- `GET /api/timetable/class/:classId` - Get class timetable
- `GET /api/timetable/day/:day` - Get timetable by day
- `PUT /api/timetable/:id` - Update timetable
- `DELETE /api/timetable/:id` - Delete timetable entry

### Parents
- `POST /api/parents/register` - Register parent
- `GET /api/parents` - Get all parents
- `GET /api/parents/:id` - Get parent details
- `PUT /api/parents/:id` - Update parent
- `DELETE /api/parents/:id` - Delete parent

### Fees
- `POST /api/fees` - Create fee record
- `GET /api/fees` - Get all fees
- `GET /api/fees/student/:studentId` - Get student fees
- `GET /api/fees/status/pending` - Get pending fees
- `PUT /api/fees/:id` - Update fee status
- `DELETE /api/fees/:id` - Delete fee record

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/inbox/:userId` - Get inbox
- `GET /api/messages/sent/:userId` - Get sent messages
- `GET /api/messages/conversation/:userId/:otherUserId` - Get conversation
- `PUT /api/messages/:id/read` - Mark as read
- `DELETE /api/messages/:id` - Delete message

### Notifications
- `POST /api/notifications` - Create notification
- `GET /api/notifications/:userId` - Get notifications
- `GET /api/notifications/:userId/unread` - Get unread
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/:userId/readAll` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Analytics
- `GET /api/analytics/attendance/stats/:classId` - Attendance stats
- `GET /api/analytics/marks/stats/:classId` - Marks stats
- `GET /api/analytics/fees/stats/:classId` - Fee stats
- `GET /api/analytics/dashboard/stats` - Dashboard stats
- `GET /api/analytics/report/attendance/:classId` - Attendance report
- `GET /api/analytics/report/marks/:classId` - Marks report

### Audit Logs
- `POST /api/auditlogs` - Create log
- `GET /api/auditlogs` - Get all logs
- `GET /api/auditlogs/user/:userId` - Get user logs
- `GET /api/auditlogs/module/:module` - Get module logs

## 🔐 Authentication & Authorization

### Roles
- **Admin**: Full access to all features
- **Teacher**: Can manage attendance, marks, and view class info
- **Student**: Can view own attendance, marks, exams, fees
- **Parent**: Can view child's information only

### Implementation
```javascript
// Use role middleware
app.post('/api/classes', roleMiddleware(['admin']), classController.create);
```

## 📧 Email Configuration

Set up in `.env`:
```
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=School Management <noreply@school.com>
```

## 🔄 Workflow Examples

### Adding a New Class
1. Admin navigates to `admin/manage-classes.html`
2. Clicks "Add New Class" button
3. Fills form with class details
4. API creates class via `POST /api/classes`
5. Students can be added via `POST /api/classes/:id/addStudent/:studentId`

### Recording Attendance
1. Teacher navigates to `teacher/manage_attendance.html`
2. Selects date and marks attendance
3. System sends notification to student
4. Email alert sent to parents
5. Data logged in audit trail

### Scheduling Exam
1. Admin uses `admin/manage-exams.html`
2. Creates exam with details
3. Notifications sent to all students
4. Students view on `student/exams.html`
5. Parents notified on parent portal

### Fee Management
1. Admin creates fee record
2. System tracks due date
3. Auto-sends reminder email 3 days before
4. Parent can pay online
5. Status updated automatically

## 🚀 Installation & Setup

### Backend Setup
```bash
cd BackEnd
npm install
# Install additional packages needed for new features
npm install nodemailer speakeasy qrcode

# Create .env file with configuration
cp .env.example .env

# Start server
npm run dev  # With nodemon
# or
npm start
```

### Frontend Setup
No additional setup required. Just open HTML files in browser and ensure backend is running.

## 📊 Database Models

All models are MongoDB-based with the following structure:

### Class
- name, section, classTeacher, students, subjects, academicYear

### Subject
- name, code, teacher, creditHours, description, academicYear

### Exam
- name, subject, class, date, startTime, endTime, totalMarks, duration, location, instructions, status

### Timetable
- class, day, subject, teacher, startTime, endTime, room, academicYear

### Parent
- name, email, password, phone, relationship, child, address, city, state, pincode

### Fee
- student, amount, feeType, month, academicYear, dueDate, status, paidDate, paymentMethod, transactionId

### Message
- sender, recipient, subject, message, isRead, readAt, attachments

### Notification
- user, title, message, type, isRead, readAt, link

### AuditLog
- user, action, module, description, changes, ipAddress, userAgent

## 🎯 Future Enhancements

- SMS notifications
- Mobile app integration
- Video conferencing for online classes
- Assignment submission portal
- Student progress tracking
- Parent-teacher conference scheduling
- Hostel management
- Transportation management
- Library management
- Events and calendar

## 📞 Support

For issues or questions, please contact the development team.

---

**Last Updated**: 2024
**Version**: 2.0
