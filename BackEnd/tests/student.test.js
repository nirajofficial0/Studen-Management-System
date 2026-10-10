const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const studentRoutes = require('../routes/studentRoutes');
const authRoutes = require('../routes/authRoutes');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);

test('Student Portal Complete API Suite', async () => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/student`;

  try {
    const loginRes = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@school.com', password: 'student123' })
    });
    assert.equal(loginRes.status, 200, 'Student should be able to authenticate');
    const { token } = await loginRes.json();

    // 1. Dashboard
    const dashRes = await fetch(`${baseUrl}/dashboard?email=student@school.com`);
    assert.equal(dashRes.status, 200, 'Student dashboard should return 200');
    const dashData = await dashRes.json();
    assert.ok(dashData.student, 'Dashboard should have student info');
    assert.ok(dashData.stats, 'Dashboard should have stats');
    assert.ok(dashData.aiSuggestions, 'Dashboard should have AI suggestions');

    // 2. Profile Fetch & Update
    const profRes = await fetch(`${baseUrl}/profile?email=student@school.com`);
    assert.equal(profRes.status, 200);
    const profData = await profRes.json();
    assert.equal(profData.role, undefined); // should have student fields
    assert.ok(profData.name);

    const updateProfRes = await fetch(`${baseUrl}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Student One Updated',
        address: 'New Innovation Campus Road'
      })
    });
    assert.equal(updateProfRes.status, 200);

    // 3. Courses
    const coursesRes = await fetch(`${baseUrl}/courses`);
    assert.equal(coursesRes.status, 200);
    const coursesData = await coursesRes.json();
    assert.ok(coursesData.courses.length >= 5, 'Should have at least 5 courses');

    // 4. Marks
    const marksRes = await fetch(`${baseUrl}/marks?email=student@school.com`);
    assert.equal(marksRes.status, 200);
    const marksData = await marksRes.json();
    assert.ok(marksData.sgpa);
    assert.ok(marksData.marks.length > 0);

    // 5. Timetable
    const ttRes = await fetch(`${baseUrl}/timetable`);
    assert.equal(ttRes.status, 200);
    const ttData = await ttRes.json();
    assert.ok(ttData.timetable.Monday);

    // 6. Assignments & Submit
    const assignRes = await fetch(`${baseUrl}/assignments`);
    assert.equal(assignRes.status, 200);
    const assignData = await assignRes.json();
    assert.ok(assignData.assignments.length > 0);

    const submitRes = await fetch(`${baseUrl}/assignments/1/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionNote: 'Test automated submission',
        fileName: 'avl_trees_test.cpp'
      })
    });
    assert.equal(submitRes.status, 200);

    // 7. Exams & Admit Card
    const examRes = await fetch(`${baseUrl}/exams?email=student@school.com`);
    assert.equal(examRes.status, 200);
    const examData = await examRes.json();
    assert.ok(examData.admitCard);
    assert.ok(examData.exams.length > 0);

    // 8. Fees & Online Payment
    const feeRes = await fetch(`${baseUrl}/fees`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(feeRes.status, 200);
    const feeData = await feeRes.json();
    assert.ok(feeData.summary);

    const payRes = await fetch(`${baseUrl}/fees/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 5000,
        method: 'UPI',
        category: 'Test Semester 4 Fee'
      })
    });
    assert.equal(payRes.status, 410, 'Unverified simulated payments must not be recorded');

    // 9. Study Materials
    const smRes = await fetch(`${baseUrl}/study-materials`);
    assert.equal(smRes.status, 200);
    const smData = await smRes.json();
    assert.ok(smData.materials.length >= 4);

    // 10. Doubts
    const doubtRes = await fetch(`${baseUrl}/doubts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        subject: 'Database Management Systems',
        question: 'What is ACID property in DBMS?'
      })
    });
    assert.equal(doubtRes.status, 201);

    // 11. Leaves
    const leaveRes = await fetch(`${baseUrl}/leaves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'Medical Leave',
        fromDate: '2026-09-01',
        toDate: '2026-09-02',
        reason: 'Dentist appointment'
      })
    });
    assert.equal(leaveRes.status, 201);

    // 12. Documents
    const docRes = await fetch(`${baseUrl}/documents/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docType: 'Bonafide',
        purpose: 'Passport verification'
      })
    });
    assert.equal(docRes.status, 201);

    // 13. Feedback
    const fbRes = await fetch(`${baseUrl}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'Teacher Feedback',
        targetName: 'Dr. Arvind Rao',
        rating: 5,
        comments: 'Excellent guidance throughout the algorithms lab.'
      })
    });
    assert.equal(fbRes.status, 201);

    console.log('All Student Portal tests passed successfully!');
  } finally {
    server.close();
  }
});
