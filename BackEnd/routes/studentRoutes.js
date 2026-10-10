const express = require('express');
const { getStore } = require('../dataStore');
const { writeDB } = require('../database');
const { verifyToken } = require('../middleware/authMiddleware');
const { isMongoReady } = require('../config/db');
const User = require('../models/User');
const Fee = require('../models/Fee');
const Marks = require('../models/Marks');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// Helper to get active student
function getStudentUser(req) {
  const store = getStore();
  const email = (req.query.email || (req.user && req.user.email) || 'student@school.com').toLowerCase();
  let user = store.users.find(u => u.email.toLowerCase() === email);
  if (!user) {
    user = store.users.find(u => u.role === 'student') || store.users[0];
  }
  return user;
}

// 1. Dashboard Overview
router.get('/dashboard', (req, res) => {
  const store = getStore();
  const student = getStudentUser(req);
  const email = student.email.toLowerCase();

  // Attendance
  const studentAttendance = (store.attendance || []).filter(a => a.email && a.email.toLowerCase() === email);
  const totalClasses = studentAttendance.length || 24;
  const presentClasses = studentAttendance.length ? studentAttendance.filter(a => a.status === 'Present').length : 21;
  const attendanceRate = totalClasses ? ((presentClasses / totalClasses) * 100).toFixed(1) : "87.5";

  // Marks & GPA
  const studentMarks = (store.marks || []).filter(m => m.email && m.email.toLowerCase() === email);
  const avgMarks = studentMarks.length
    ? (studentMarks.reduce((acc, m) => acc + Number(m.marks || 0), 0) / studentMarks.length).toFixed(1)
    : "84.2";
  const gpa = (avgMarks / 10).toFixed(2);

  // Fees
  const studentFees = (store.fees || []).filter(f => !f.email || f.email.toLowerCase() === email);
  const totalFees = 45000;
  const paidFees = 30000;
  const pendingFees = totalFees - paidFees;

  // Assignments
  const assignments = store.assignments || [
    { id: 1, title: "Data Structures - Binary Search Trees", subject: "Computer Science", dueDate: "2026-08-20", status: "Pending" },
    { id: 2, title: "Database Systems - SQL Joins Query", subject: "DBMS", dueDate: "2026-08-22", status: "Submitted" },
    { id: 3, title: "Web Development - Responsive UI Project", subject: "Web Tech", dueDate: "2026-08-25", status: "Pending" }
  ];

  // Notices
  const notices = (store.notices || []).slice(0, 5);

  // AI Suggestions
  const aiSuggestions = [];
  if (Number(attendanceRate) < 75) {
    aiSuggestions.push({
      type: "warning",
      title: "Low Attendance Alert",
      text: `Your overall attendance is ${attendanceRate}%, which is below the required 75% threshold. Attend the next 5 consecutive classes to restore eligibility.`
    });
  } else {
    aiSuggestions.push({
      type: "success",
      title: "Great Attendance Streak",
      text: `Your attendance is in good standing at ${attendanceRate}%. Keep it up to qualify for academic honors!`
    });
  }

  aiSuggestions.push({
    type: "info",
    title: "AI Study Recommendation",
    text: "Upcoming Mid-Term in Data Structures. Dedicate 45 minutes daily to Tree Traversal and Graph algorithms to boost your score to an A+."
  });

  return res.json({
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone || '9876543212',
      rollNo: student.rollNo || 'STD-2026-042',
      course: student.course || 'B.Tech - Computer Science',
      semester: student.semester || 'Semester 4',
      profileImage: student.profileImage || ''
    },
    stats: {
      totalSubjects: 6,
      attendanceRate: attendanceRate + "%",
      attendanceRaw: Number(attendanceRate),
      averageMarks: avgMarks + "%",
      gpa: gpa,
      cgpa: "8.65",
      totalFees,
      paidFees,
      pendingFees,
      pendingAssignments: assignments.filter(a => a.status === 'Pending').length
    },
    recentMarks: studentMarks.slice(0, 4),
    assignments: assignments.slice(0, 3),
    notices,
    aiSuggestions
  });
});

// 2. Profile Details & Update
router.get('/profile', (req, res) => {
  const student = getStudentUser(req);
  return res.json({
    id: student.id,
    name: student.name,
    email: student.email,
    phone: student.phone || '9876543212',
    rollNo: student.rollNo || 'STD-2026-042',
    course: student.course || 'B.Tech - Computer Science',
    semester: student.semester || 'Semester 4',
    bloodGroup: student.bloodGroup || 'O+',
    dateOfBirth: student.dateOfBirth || '2004-05-14',
    address: student.address || '42, Innovation Street, Knowledge Park',
    city: student.city || 'Tech City',
    state: student.state || 'Karnataka',
    pincode: student.pincode || '560001',
    guardianName: student.guardianName || 'Rajesh Sharma',
    guardianPhone: student.guardianPhone || '9876543299',
    department: student.department || 'School of Engineering & Technology',
    academicYear: '2025-2026',
    admissionDate: '2024-08-01',
    profileImage: student.profileImage || ''
  });
});

router.put('/profile', async (req, res) => {
  const store = getStore();
  const student = getStudentUser(req);
  const { name, phone, address, city, state, pincode, dateOfBirth, bloodGroup, guardianName, guardianPhone, profileImage } = req.body;

  const idx = store.users.findIndex(u => u.email.toLowerCase() === student.email.toLowerCase());
  if (idx !== -1) {
    if (name) store.users[idx].name = name;
    if (phone) store.users[idx].phone = phone;
    if (address) store.users[idx].address = address;
    if (city) store.users[idx].city = city;
    if (state) store.users[idx].state = state;
    if (pincode) store.users[idx].pincode = pincode;
    if (dateOfBirth) store.users[idx].dateOfBirth = dateOfBirth;
    if (bloodGroup) store.users[idx].bloodGroup = bloodGroup;
    if (guardianName) store.users[idx].guardianName = guardianName;
    if (guardianPhone) store.users[idx].guardianPhone = guardianPhone;
    if (profileImage) store.users[idx].profileImage = profileImage;

    writeDB(store);
  }

  return res.json({ message: 'Profile updated successfully!', user: store.users[idx] || student });
});

// 3. Courses & Subjects
router.get('/courses', (req, res) => {
  const courses = [
    {
      code: "CS401",
      title: "Design & Analysis of Algorithms",
      credits: 4,
      faculty: "Dr. Arvind Rao",
      semester: "Semester 4",
      syllabusProgress: 68,
      modules: ["Divide & Conquer", "Dynamic Programming", "Greedy Techniques", "Graph Theory", "NP-Completeness"]
    },
    {
      code: "CS402",
      title: "Database Management Systems",
      credits: 4,
      faculty: "Prof. Priya Nair",
      semester: "Semester 4",
      syllabusProgress: 75,
      modules: ["ER Modeling", "Relational Algebra", "SQL Queries", "Normalization (1NF-BCNF)", "Transactions & ACID"]
    },
    {
      code: "CS403",
      title: "Operating Systems",
      credits: 3,
      faculty: "Prof. Rajesh Verma",
      semester: "Semester 4",
      syllabusProgress: 60,
      modules: ["Process Scheduling", "Deadlocks & Semaphores", "Memory Management", "Virtual Memory", "File Systems"]
    },
    {
      code: "CS404",
      title: "Web Technologies & Frameworks",
      credits: 3,
      faculty: "Dr. Ananya Roy",
      semester: "Semester 4",
      syllabusProgress: 82,
      modules: ["HTML5 & CSS3", "Modern JavaScript (ES6+)", "RESTful APIs", "Node.js & Express", "Frontend Security"]
    },
    {
      code: "MA405",
      title: "Discrete Mathematics & Graph Theory",
      credits: 4,
      faculty: "Prof. S. K. Gupta",
      semester: "Semester 4",
      syllabusProgress: 55,
      modules: ["Set Theory & Logic", "Combinatorics", "Recurrence Relations", "Trees & Graphs", "Algebraic Structures"]
    },
    {
      code: "CS406L",
      title: "DBMS & Web Application Laboratory",
      credits: 2,
      faculty: "Prof. Priya Nair / Dr. Ananya Roy",
      semester: "Semester 4",
      syllabusProgress: 90,
      modules: ["SQL Schema Creation", "Stored Procedures", "Express API Lab", "Full Stack Integration"]
    }
  ];

  return res.json({
    courseName: "Bachelor of Technology in Computer Science & Engineering",
    currentSemester: "Semester 4",
    totalCredits: 20,
    courses
  });
});

// 4. Detailed Marks & Results
router.get('/marks', async (req, res) => {
  const student = getStudentUser(req);
  let detailedMarks = [
    {
      code: "CS401",
      subject: "Design & Analysis of Algorithms",
      internal: 18,
      assignment: 9,
      practical: 18,
      finalExam: 44,
      total: 89,
      maxTotal: 100,
      grade: "A+",
      gradePoint: 10,
      credits: 4
    },
    {
      code: "CS402",
      subject: "Database Management Systems",
      internal: 17,
      assignment: 10,
      practical: 19,
      finalExam: 42,
      total: 88,
      maxTotal: 100,
      grade: "A",
      gradePoint: 9,
      credits: 4
    },
    {
      code: "CS403",
      subject: "Operating Systems",
      internal: 15,
      assignment: 8,
      practical: 16,
      finalExam: 39,
      total: 78,
      maxTotal: 100,
      grade: "B+",
      gradePoint: 8,
      credits: 3
    },
    {
      code: "CS404",
      subject: "Web Technologies & Frameworks",
      internal: 19,
      assignment: 10,
      practical: 20,
      finalExam: 46,
      total: 95,
      maxTotal: 100,
      grade: "A+",
      gradePoint: 10,
      credits: 3
    },
    {
      code: "MA405",
      subject: "Discrete Mathematics & Graph Theory",
      internal: 16,
      assignment: 9,
      practical: 17,
      finalExam: 38,
      total: 80,
      maxTotal: 100,
      grade: "A",
      gradePoint: 9,
      credits: 4
    },
    {
      code: "CS406L",
      subject: "DBMS & Web Application Laboratory",
      internal: 19,
      assignment: 10,
      practical: 20,
      finalExam: 48,
      total: 97,
      maxTotal: 100,
      grade: "A+",
      gradePoint: 10,
      credits: 2
    }
  ];

  const storedMarks = isMongoReady()
    ? await Marks.find({ email: student.email.toLowerCase() }).sort({ createdAt: -1 }).lean()
    : (getStore().marks || []).filter(mark => mark.email && mark.email.toLowerCase() === student.email.toLowerCase());
  if (storedMarks.length) {
    detailedMarks = storedMarks.map(record => {
      const total = Number(record.marks);
      const grade = total >= 90 ? 'A+' : total >= 80 ? 'A' : total >= 70 ? 'B+' : total >= 60 ? 'B' : total >= 50 ? 'C' : total >= 40 ? 'D' : 'F';
      const gradePoint = total >= 90 ? 10 : total >= 80 ? 9 : total >= 70 ? 8 : total >= 60 ? 7 : total >= 50 ? 6 : total >= 40 ? 5 : 0;
      return {
        code: record.subject,
        subject: record.subject,
        internal: '—',
        assignment: '—',
        practical: '—',
        finalExam: '—',
        total,
        maxTotal: 100,
        grade,
        gradePoint,
        credits: 1
      };
    });
  }

  const totalCredits = detailedMarks.reduce((acc, m) => acc + m.credits, 0);
  const totalWeightedPoints = detailedMarks.reduce((acc, m) => acc + (m.gradePoint * m.credits), 0);
  const sgpa = (totalWeightedPoints / totalCredits).toFixed(2);
  const cgpa = storedMarks.length ? '—' : "8.82";

  return res.json({
    student: {
      name: student.name,
      rollNo: student.rollNo || 'STD-2026-042',
      course: student.course || 'B.Tech - Computer Science',
      semester: student.semester || 'Semester 4',
      academicYear: "2025-2026"
    },
    sgpa,
    cgpa,
    totalCredits,
    marks: detailedMarks
  });
});

// 5. Timetable
router.get('/timetable', (req, res) => {
  const schedule = {
    Monday: [
      { time: "09:00 AM - 10:00 AM", subject: "Design & Analysis of Algorithms", code: "CS401", teacher: "Dr. Arvind Rao", room: "Hall-101" },
      { time: "10:00 AM - 11:00 AM", subject: "Database Management Systems", code: "CS402", teacher: "Prof. Priya Nair", room: "Hall-102" },
      { time: "11:15 AM - 12:15 PM", subject: "Operating Systems", code: "CS403", teacher: "Prof. Rajesh Verma", room: "Hall-104" },
      { time: "01:30 PM - 03:30 PM", subject: "DBMS & Web Application Lab", code: "CS406L", teacher: "Prof. Priya Nair", room: "Lab-3" }
    ],
    Tuesday: [
      { time: "09:00 AM - 10:00 AM", subject: "Discrete Mathematics", code: "MA405", teacher: "Prof. S. K. Gupta", room: "Hall-201" },
      { time: "10:00 AM - 11:00 AM", subject: "Web Technologies", code: "CS404", teacher: "Dr. Ananya Roy", room: "Hall-105" },
      { time: "11:15 AM - 12:15 PM", subject: "Design & Analysis of Algorithms", code: "CS401", teacher: "Dr. Arvind Rao", room: "Hall-101" },
      { time: "01:30 PM - 02:30 PM", subject: "Library & Self Study", code: "LIB", teacher: "Librarian", room: "Central Library" }
    ],
    Wednesday: [
      { time: "09:00 AM - 10:00 AM", subject: "Database Management Systems", code: "CS402", teacher: "Prof. Priya Nair", room: "Hall-102" },
      { time: "10:00 AM - 11:00 AM", subject: "Operating Systems", code: "CS403", teacher: "Prof. Rajesh Verma", room: "Hall-104" },
      { time: "11:15 AM - 12:15 PM", subject: "Discrete Mathematics", code: "MA405", teacher: "Prof. S. K. Gupta", room: "Hall-201" },
      { time: "01:30 PM - 03:30 PM", subject: "Project & Seminar Session", code: "PRJ401", teacher: "Dr. Ananya Roy", room: "Lab-2" }
    ],
    Thursday: [
      { time: "09:00 AM - 10:00 AM", subject: "Web Technologies", code: "CS404", teacher: "Dr. Ananya Roy", room: "Hall-105" },
      { time: "10:00 AM - 11:00 AM", subject: "Design & Analysis of Algorithms", code: "CS401", teacher: "Dr. Arvind Rao", room: "Hall-101" },
      { time: "11:15 AM - 12:15 PM", subject: "Operating Systems", code: "CS403", teacher: "Prof. Rajesh Verma", room: "Hall-104" },
      { time: "01:30 PM - 02:30 PM", subject: "Tutorial: Discrete Math", code: "TUT405", teacher: "Prof. S. K. Gupta", room: "Hall-201" }
    ],
    Friday: [
      { time: "09:00 AM - 10:00 AM", subject: "Database Management Systems", code: "CS402", teacher: "Prof. Priya Nair", room: "Hall-102" },
      { time: "10:00 AM - 11:00 AM", subject: "Web Technologies", code: "CS404", teacher: "Dr. Ananya Roy", room: "Hall-105" },
      { time: "11:15 AM - 12:15 PM", subject: "Discrete Mathematics", code: "MA405", teacher: "Prof. S. K. Gupta", room: "Hall-201" },
      { time: "01:30 PM - 03:30 PM", subject: "Algorithms Coding Lab", code: "CS401L", teacher: "Dr. Arvind Rao", room: "Lab-1" }
    ],
    Saturday: [
      { time: "09:30 AM - 11:30 AM", subject: "Industry Guest Lecture / Tech Talk", code: "GL401", teacher: "Guest Speaker", room: "Auditorium" },
      { time: "11:45 AM - 01:00 PM", subject: "Student Club & Sports Activities", code: "ACT", teacher: "Club Mentor", room: "Campus Grounds" }
    ]
  };

  return res.json({ timetable: schedule });
});

// 6. Assignments
router.get('/assignments', (req, res) => {
  const store = getStore();
  const assignments = store.assignments || [
    {
      id: 1,
      title: "Binary Search Trees & AVL Tree Balancing",
      subject: "Design & Analysis of Algorithms",
      code: "CS401",
      teacher: "Dr. Arvind Rao",
      dueDate: "2026-08-20",
      totalMarks: 20,
      status: "Pending",
      description: "Implement AVL rotation methods in C++/Java and analyze asymptotic runtime.",
      downloadFile: "Assignment_1_AVL_Trees.pdf",
      submissionNote: "",
      submittedAt: null,
      score: null,
      feedback: ""
    },
    {
      id: 2,
      title: "Complex SQL Joins & Query Optimization",
      subject: "Database Management Systems",
      code: "CS402",
      teacher: "Prof. Priya Nair",
      dueDate: "2026-08-14",
      totalMarks: 20,
      status: "Graded",
      description: "Write queries for 5 business use cases and generate execution plans.",
      downloadFile: "DBMS_Assignment_Joins.pdf",
      submissionNote: "Submitted queries script with indexing explanations.",
      submittedAt: "2026-08-13T16:30:00.000Z",
      score: 19,
      feedback: "Excellent query optimization and thorough indexing documentation!"
    },
    {
      id: 3,
      title: "Responsive Student Portal UI Development",
      subject: "Web Technologies",
      code: "CS404",
      teacher: "Dr. Ananya Roy",
      dueDate: "2026-08-25",
      totalMarks: 25,
      status: "Pending",
      description: "Build interactive frontend components with clean CSS and vanilla JS.",
      downloadFile: "WebTech_Assignment_3.pdf",
      submissionNote: "",
      submittedAt: null,
      score: null,
      feedback: ""
    },
    {
      id: 4,
      title: "Banker's Deadlock Avoidance Algorithm",
      subject: "Operating Systems",
      code: "CS403",
      teacher: "Prof. Rajesh Verma",
      dueDate: "2026-08-12",
      totalMarks: 15,
      status: "Graded",
      description: "Simulate resource allocation graph and detect safe state.",
      downloadFile: "OS_Assignment_Deadlock.pdf",
      submissionNote: "Program code attached with test matrix.",
      submittedAt: "2026-08-11T14:15:00.000Z",
      score: 14,
      feedback: "Good edge case testing."
    }
  ];

  return res.json({ assignments });
});

router.post('/assignments/:id/submit', (req, res) => {
  const store = getStore();
  const id = Number(req.params.id);
  const { submissionNote, fileName } = req.body;

  if (!store.assignments) {
    store.assignments = [
      { id: 1, title: "Binary Search Trees", subject: "DAA", dueDate: "2026-08-20", status: "Pending", totalMarks: 20 },
      { id: 2, title: "Complex SQL Joins", subject: "DBMS", dueDate: "2026-08-14", status: "Graded", totalMarks: 20, score: 19 },
      { id: 3, title: "Responsive Web UI", subject: "Web Tech", dueDate: "2026-08-25", status: "Pending", totalMarks: 25 }
    ];
  }

  const assignment = store.assignments.find(a => a.id === id);
  if (assignment) {
    assignment.status = "Submitted";
    assignment.submissionNote = submissionNote || `Submitted file: ${fileName || 'solution.zip'}`;
    assignment.fileUrl = req.body.fileUrl || null;
    assignment.submittedAt = new Date().toISOString();
    writeDB(store);
    return res.json({ message: "Assignment submitted successfully!", assignment });
  }

  return res.json({
    message: "Assignment submitted successfully!",
    assignment: { id, status: "Submitted", fileUrl: req.body.fileUrl || null, submittedAt: new Date().toISOString() }
  });
});

// 7. Exams & Admit Card
router.get('/exams', (req, res) => {
  const student = getStudentUser(req);
  const exams = [
    {
      id: "EX-401",
      subject: "Design & Analysis of Algorithms",
      code: "CS401",
      date: "2026-09-05",
      time: "10:00 AM - 01:00 PM",
      room: "Exam Hall A-201",
      seatNo: "CS-42",
      duration: "3 Hours",
      totalMarks: 100,
      status: "Upcoming"
    },
    {
      id: "EX-402",
      subject: "Database Management Systems",
      code: "CS402",
      date: "2026-09-07",
      time: "10:00 AM - 01:00 PM",
      room: "Exam Hall A-201",
      seatNo: "CS-42",
      duration: "3 Hours",
      totalMarks: 100,
      status: "Upcoming"
    },
    {
      id: "EX-403",
      subject: "Operating Systems",
      code: "CS403",
      date: "2026-09-09",
      time: "10:00 AM - 01:00 PM",
      room: "Exam Hall B-105",
      seatNo: "CS-42",
      duration: "3 Hours",
      totalMarks: 100,
      status: "Upcoming"
    },
    {
      id: "EX-404",
      subject: "Web Technologies & Frameworks",
      code: "CS404",
      date: "2026-09-11",
      time: "10:00 AM - 01:00 PM",
      room: "Exam Hall B-105",
      seatNo: "CS-42",
      duration: "3 Hours",
      totalMarks: 100,
      status: "Upcoming"
    },
    {
      id: "EX-405",
      subject: "Discrete Mathematics & Graph Theory",
      code: "MA405",
      date: "2026-09-14",
      time: "10:00 AM - 01:00 PM",
      room: "Exam Hall C-302",
      seatNo: "CS-42",
      duration: "3 Hours",
      totalMarks: 100,
      status: "Upcoming"
    }
  ];

  return res.json({
    admitCard: {
      studentName: student.name,
      rollNo: student.rollNo || 'STD-2026-042',
      course: student.course || 'B.Tech - Computer Science',
      semester: student.semester || 'Semester 4',
      examCenter: "Main Campus Examination Block, Wing A",
      examSession: "Autumn 2026",
      instructions: [
        "Candidates must carry this printed Admit Card and valid Student ID to the examination hall.",
        "Entry is prohibited 15 minutes after the scheduled start time.",
        "Electronic gadgets, smartwatches, and unauthorized notes are strictly prohibited."
      ]
    },
    exams
  });
});

// 8. Fees & Payments
router.get('/fees', verifyToken, async (req, res) => {
  try {
    const store = getStore();
    const student = getStudentUser(req);
    const studentEmail = req.user.email.toLowerCase();
    let transactions = (store.studentTransactions || [])
      .filter(transaction => transaction.email === studentEmail)
      .map(transaction => ({
        ...transaction,
        date: transaction.date || transaction.paidAt
      }));
    let paidFees;

    if (isMongoReady()) {
      const account = await User.findById(req.user.id);
      if (!account || account.role !== 'student') {
        return res.status(403).json({ message: 'Student account is required to view fee details.' });
      }
      const payments = await Fee.find({ student: account._id, status: 'paid' }).sort({ paidDate: -1 }).lean();
      paidFees = payments.reduce((total, fee) => total + Number(fee.amount || 0), 0);
      transactions = payments.map(payment => ({
        txnId: payment.transactionId,
        date: payment.paidDate ? payment.paidDate.toISOString().split('T')[0] : '',
        amount: payment.amount,
        method: 'Razorpay',
        category: payment.category || 'Semester Fee Payment',
        status: 'Success',
        receiptNo: payment.receiptNo
      }));
    } else {
      paidFees = Number(
        (store.paidFeesByStudent && store.paidFeesByStudent[studentEmail]) ??
        (studentEmail === 'student@school.com' ? (store.paidFeesAmount ?? 30000) :
          transactions.reduce((total, transaction) => total + Number(transaction.amount || 0), 0))
      );
    }

    const feeSummary = {
      totalFees: 45000,
      paidFees,
      pendingFees: Math.max(0, 45000 - paidFees),
      dueDate: "2026-09-15"
    };

    let remainingPaidAmount = paidFees;
    const feeComponents = [
      { name: "Tuition Fee (Sem 4)", amount: 30000 },
      { name: "Computer & Hardware Lab Fee", amount: 6000 },
      { name: "Library & E-Resources Fee", amount: 3000 },
      { name: "Semester Examination Fee", amount: 4000 },
      { name: "Sports & Campus Development", amount: 2000 }
    ].map(component => {
      const isPaid = remainingPaidAmount >= component.amount;
      if (isPaid) remainingPaidAmount -= component.amount;
      return { ...component, status: isPaid ? 'Paid' : 'Pending' };
    });

    return res.json({
      student: {
        name: req.user.name || student.name,
        rollNo: req.user.rollNo || student.rollNo || '',
        course: student.course || 'B.Tech - Computer Science'
      },
      summary: feeSummary,
      components: feeComponents,
      transactions
    });
  } catch (error) {
    return res.status(500).json({ message: `Could not load fee information: ${error.message}` });
  }
});

router.post('/fees/pay', (req, res) => {
  return res.status(410).json({
    message: 'Direct simulated payments are disabled. Create and verify a Razorpay order to record a payment.'
  });
});

// 9. Study Materials
router.get('/study-materials', (req, res) => {
  const materials = [
    {
      id: 1,
      title: "AVL Trees & Red-Black Trees Complete Notes",
      subject: "Design & Analysis of Algorithms",
      code: "CS401",
      type: "PDF Notes",
      size: "2.4 MB",
      uploadedBy: "Dr. Arvind Rao",
      date: "2026-08-10",
      link: "#download-notes-1"
    },
    {
      id: 2,
      title: "SQL Joins, Subqueries & Transactions Handbook",
      subject: "Database Management Systems",
      code: "CS402",
      type: "PDF Notes",
      size: "3.8 MB",
      uploadedBy: "Prof. Priya Nair",
      date: "2026-08-08",
      link: "#download-notes-2"
    },
    {
      id: 3,
      title: "Process Synchronization & Semaphore Video Lecture",
      subject: "Operating Systems",
      code: "CS403",
      type: "Video",
      duration: "45 mins",
      uploadedBy: "Prof. Rajesh Verma",
      date: "2026-08-05",
      link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    },
    {
      id: 4,
      title: "Previous 5-Year Question Papers (2020-2025)",
      subject: "Design & Analysis of Algorithms",
      code: "CS401",
      type: "PYQ",
      size: "8.1 MB",
      uploadedBy: "Academic Dept",
      date: "2026-08-01",
      link: "#download-pyq-1"
    },
    {
      id: 5,
      title: "Modern JavaScript (ES6+) and DOM Cheat Sheet",
      subject: "Web Technologies",
      code: "CS404",
      type: "PDF Notes",
      size: "1.9 MB",
      uploadedBy: "Dr. Ananya Roy",
      date: "2026-08-03",
      link: "#download-notes-4"
    },
    {
      id: 6,
      title: "Discrete Math Solved Problem Set (Graph & Combinatorics)",
      subject: "Discrete Mathematics",
      code: "MA405",
      type: "PYQ",
      size: "4.5 MB",
      uploadedBy: "Prof. S. K. Gupta",
      date: "2026-07-29",
      link: "#download-pyq-2"
    }
  ];

  return res.json({ materials });
});

// 10. Communication & Doubts
router.get('/doubts', verifyToken, roleMiddleware(['student', 'teacher', 'admin']), (req, res) => {
  const store = getStore();
  return res.json({ doubts: store.studentDoubts || [] });
});

router.post('/doubts', verifyToken, roleMiddleware(['student']), (req, res) => {
  const store = getStore();
  const { subject, teacher, question } = req.body;

  if (!question || !subject) {
    return res.status(400).json({ message: "Please provide a subject and your question." });
  }

  const newDoubt = {
    id: Date.now(),
    studentName: req.user.name,
    studentId: req.user.id,
    subject,
    teacher: teacher || "Course Faculty",
    question,
    reply: "",
    status: "Pending Response",
    date: new Date().toISOString()
  };

  if (!store.studentDoubts) {
    store.studentDoubts = [];
  }
  store.studentDoubts.unshift(newDoubt);
  writeDB(store);
  const io = req.app.get('io');
  if (io) io.to('role:teacher').emit('doubt_received', newDoubt);

  return res.status(201).json({ message: "Doubt submitted to teacher successfully!", doubt: newDoubt });
});

router.post('/doubts/:id/reply', verifyToken, roleMiddleware(['teacher', 'admin']), (req, res) => {
  const reply = String(req.body.reply || '').trim();
  if (!reply) return res.status(400).json({ message: 'Reply text is required.' });
  if (reply.length > 5000) return res.status(400).json({ message: 'Reply cannot exceed 5000 characters.' });
  const store = getStore();
  const doubts = store.studentDoubts || [];
  const doubt = doubts.find(item => String(item.id) === String(req.params.id));
  if (!doubt) return res.status(404).json({ message: 'Student inquiry was not found.' });
  doubt.reply = reply;
  doubt.status = 'Answered';
  doubt.repliedAt = new Date().toISOString();
  doubt.teacherName = req.user.name;
  writeDB(store);
  const io = req.app.get('io');
  if (io && doubt.studentId) io.to(`user:${doubt.studentId}`).emit('doubt_answered', doubt);
  return res.json({ message: 'Reply sent.', doubt, doubts });
});

// 11. Leave Management
router.get('/leaves', (req, res) => {
  const store = getStore();
  const leaves = store.studentLeaves || [
    {
      id: 1,
      type: "Medical Leave",
      fromDate: "2026-07-18",
      toDate: "2026-07-20",
      reason: "Viral fever and doctor recommended rest.",
      status: "Approved",
      appliedOn: "2026-07-17",
      approverComment: "Approved. Medical certificate verified."
    },
    {
      id: 2,
      type: "Academic Leave",
      fromDate: "2026-08-02",
      toDate: "2026-08-03",
      reason: "Attending National Level Hackathon in Tech Park.",
      status: "Approved",
      appliedOn: "2026-07-29",
      approverComment: "Approved for college representation."
    }
  ];

  return res.json({ leaves });
});

router.post('/leaves', (req, res) => {
  const store = getStore();
  const { type, fromDate, toDate, reason } = req.body;

  if (!type || !fromDate || !toDate || !reason) {
    return res.status(400).json({ message: "Please fill all leave details." });
  }

  const newLeave = {
    id: Date.now(),
    type,
    fromDate,
    toDate,
    reason,
    status: "Pending",
    appliedOn: new Date().toISOString().split('T')[0],
    approverComment: "Under review by Department Head."
  };

  if (!store.studentLeaves) {
    store.studentLeaves = [];
  }
  store.studentLeaves.unshift(newLeave);
  writeDB(store);

  return res.status(201).json({ message: "Leave application submitted successfully!", leave: newLeave });
});

// 12. Certificates & Documents
router.get('/documents', (req, res) => {
  const store = getStore();
  const student = getStudentUser(req);
  const documents = store.studentDocuments || [
    {
      id: "DOC-1",
      title: "Digital Student ID Card",
      type: "ID Card",
      status: "Issued",
      issueDate: "2024-08-10",
      validTill: "2028-06-30",
      downloadable: true
    },
    {
      id: "DOC-2",
      title: "Bonafide Student Certificate",
      type: "Bonafide",
      status: "Approved",
      issueDate: "2026-08-01",
      validTill: "2026-12-31",
      downloadable: true
    },
    {
      id: "DOC-3",
      title: "Fee Clearance Certificate (Sem 3)",
      type: "Fee Clearance",
      status: "Issued",
      issueDate: "2026-02-01",
      validTill: "Permanent",
      downloadable: true
    }
  ];

  return res.json({ student, documents });
});

router.post('/documents/request', (req, res) => {
  const store = getStore();
  const { docType, purpose } = req.body;

  if (!docType || !purpose) {
    return res.status(400).json({ message: "Please specify document type and purpose." });
  }

  const newDoc = {
    id: "DOC-" + Math.floor(100 + Math.random() * 900),
    title: docType + " Certificate",
    type: docType,
    status: "In Process",
    issueDate: new Date().toISOString().split('T')[0],
    purpose,
    validTill: "Pending Approval",
    downloadable: false
  };

  if (!store.studentDocuments) {
    store.studentDocuments = [];
  }
  store.studentDocuments.unshift(newDoc);
  writeDB(store);

  return res.status(201).json({ message: `${docType} request submitted successfully!`, document: newDoc });
});

// 13. Student Feedback
router.get('/feedback', (req, res) => {
  const store = getStore();
  const feedbacks = store.studentFeedbackList || [];
  return res.json({ feedbacks });
});

router.post('/feedback', (req, res) => {
  const store = getStore();
  const { category, targetName, rating, comments } = req.body;

  if (!category || !rating || !comments) {
    return res.status(400).json({ message: "Please fill all feedback fields." });
  }

  const feedbackEntry = {
    id: Date.now(),
    category,
    targetName: targetName || "General",
    rating: Number(rating),
    comments,
    submittedAt: new Date().toISOString()
  };

  if (!store.studentFeedbackList) {
    store.studentFeedbackList = [];
  }
  store.studentFeedbackList.unshift(feedbackEntry);
  writeDB(store);

  return res.status(201).json({ message: "Thank you for your valuable feedback!", feedback: feedbackEntry });
});

module.exports = router;
