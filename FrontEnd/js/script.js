const API_BASE_URL = `${window.SCHOOL_API_ORIGIN || "http://localhost:5001"}/api`;

const STORAGE_KEYS = {
    users: "school_users",
    currentUser: "school_current_user",
    token: "school_token",
    attendance: "school_attendance",
    marks: "school_marks",
    notices: "school_notices"
};

const DEFAULT_USERS = [
    {
        id: "admin-1",
        name: "Admin User",
        email: "admin@school.com",
        phone: "9876543210",
        password: "admin123",
        role: "admin"
    },
    {
        id: "teacher-1",
        name: "Teacher One",
        email: "teacher@school.com",
        phone: "9876543211",
        password: "teacher123",
        role: "teacher"
    },
    {
        id: "student-1",
        name: "Student One",
        email: "student@school.com",
        phone: "9876543212",
        password: "student123",
        role: "student"
    }
];

const DEFAULT_NOTICES = [
    {
        id: "notice-1",
        title: "School Reopening",
        message: "All students must report to campus on Monday at 9:00 AM.",
        date: new Date().toISOString()
    },
    {
        id: "notice-2",
        title: "Exam Schedule",
        message: "Mid-term exams will start from next week. Please prepare the syllabus.",
        date: new Date().toISOString()
    }
];

function ensureDefaultData() {
    if (!localStorage.getItem(STORAGE_KEYS.users)) {
        localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(DEFAULT_USERS));
    }

    if (!localStorage.getItem(STORAGE_KEYS.notices)) {
        localStorage.setItem(STORAGE_KEYS.notices, JSON.stringify(DEFAULT_NOTICES));
    }
}

function getUsers() {
    ensureDefaultData();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.users)) || [];
}

function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.currentUser)) || null;
}

function saveCurrentUser(user) {
    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
}

function getToken() {
    return localStorage.getItem(STORAGE_KEYS.token) || "";
}

function saveToken(token) {
    localStorage.setItem(STORAGE_KEYS.token, token);
}

function getStudents() {
    return getUsers().filter(user => user.role === "student");
}

function getTeachers() {
    return getUsers().filter(user => user.role === "teacher");
}

async function apiRequest(endpoint, options = {}) {
    const token = getToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        },
        ...options
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }

    return data;
}

function openRealtimeSocket() {
    if (!window.io || !getToken()) return null;
    if (!window.schoolSocket) {
        window.schoolSocket = window.io(window.SCHOOL_API_ORIGIN || "http://localhost:5001", {
            auth: { token: getToken() }
        });
    }
    return window.schoolSocket;
}

function getAttendance() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.attendance)) || [];
}

function saveAttendanceData(data) {
    localStorage.setItem(STORAGE_KEYS.attendance, JSON.stringify(data));
}

function getMarks() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.marks)) || [];
}

function saveMarksData(data) {
    localStorage.setItem(STORAGE_KEYS.marks, JSON.stringify(data));
}

function getNotices() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.notices)) || [];
}

function saveNotices(data) {
    localStorage.setItem(STORAGE_KEYS.notices, JSON.stringify(data));
}

function generateId(prefix) {
    return prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

function getGrade(marks) {
    if (marks >= 90) return "A+";
    if (marks >= 80) return "A";
    if (marks >= 70) return "B";
    if (marks >= 60) return "C";
    if (marks >= 40) return "D";
    return "F";
}

function logout() {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    localStorage.removeItem(STORAGE_KEYS.token);
    window.location.href = "../index.html";
}

function redirectByRole(user) {
    if (user.role === "admin") {
        window.location.href = "admin/dashboard.html";
    } else if (user.role === "teacher") {
        window.location.href = "teacher/dashboard.html";
    } else if (user.role === "parent") {
        window.location.href = "parent/dashboard.html";
    } else {
        window.location.href = "student/dashboard.html";
    }
}

function redirectIfNotAuthorized(expectedRole) {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = "../index.html";
        return false;
    }

    if (expectedRole && user.role !== expectedRole) {
        if (user.role === "admin") {
            window.location.href = "../admin/dashboard.html";
        } else if (user.role === "teacher") {
            window.location.href = "../teacher/dashboard.html";
        } else if (user.role === "parent") {
            window.location.href = "../parent/dashboard.html";
        } else {
            window.location.href = "../student/dashboard.html";
        }
        return false;
    }

    return true;
}

if (document.getElementById("registerForm")) {
    document.getElementById("registerForm").addEventListener("submit", async function (e) {
        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const phone = document.getElementById("phone") ? document.getElementById("phone").value.trim() : "";
        const password = document.getElementById("password").value.trim();
        const role = document.getElementById("role").value;

        if (!name || !email || !password || !phone) {
            alert("Please fill all fields, including your 10-digit mobile number.");
            return;
        }

        if (!/^\d{10}$/.test(phone)) {
            alert("Please enter a valid 10-digit mobile number.");
            return;
        }

        if (password.length < 4) {
            alert("Password must be at least 4 characters long.");
            return;
        }

        try {
            const data = await apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, phone, password, role })
            });

            saveCurrentUser(data.user);
            saveToken(data.token);
            alert("Registration Successful!");
            redirectByRole(data.user);
        } catch (error) {
            // Local storage fallback if offline
            const users = getUsers();
            const exists = users.some(
                u => u.email.toLowerCase() === email.toLowerCase() ||
                (u.phone && String(u.phone).trim() === phone)
            );

            if (exists) {
                alert("User with this email or mobile number already exists.");
                return;
            }

            const newUser = {
                id: generateId("user"),
                name,
                email,
                phone,
                password,
                role
            };

            users.push(newUser);
            saveUsers(users);
            saveCurrentUser(newUser);
            saveToken("offline-token-" + Date.now());
            alert("Registration Successful!");
            redirectByRole(newUser);
        }
    });
}

if (document.getElementById("loginForm")) {
    document.getElementById("loginForm").addEventListener("submit", async function (e) {
        e.preventDefault();

        const identifierInput = document.getElementById("loginEmail") || document.getElementById("loginIdentifier");
        const identifier = identifierInput ? identifierInput.value.trim() : "";
        const password = document.getElementById("loginPassword").value.trim();

        if (!identifier || !password) {
            alert("Please enter your email or mobile number and password.");
            return;
        }

        try {
            const data = await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ identifier, email: identifier, password })
            });

            saveCurrentUser(data.user);
            saveToken(data.token);
            alert("Login Successful!");
            redirectByRole(data.user);
        } catch (error) {
            // Local fallback
            const users = getUsers();
            const matchedUser = users.find(
                u => (u.email.toLowerCase() === identifier.toLowerCase() ||
                     (u.phone && String(u.phone).trim() === identifier)) &&
                     u.password === password
            );

            if (matchedUser) {
                saveCurrentUser(matchedUser);
                saveToken("offline-token-" + Date.now());
                alert("Login Successful!");
                redirectByRole(matchedUser);
            } else {
                alert(error.message || "Invalid email/mobile number or password.");
            }
        }
    });
}

if (document.getElementById("btnVerifyPhone")) {
    document.getElementById("btnVerifyPhone").addEventListener("click", async function () {
        const phone = document.getElementById("resetPhone").value.trim();
        const role = document.getElementById("resetRole").value;
        const phoneInfo = document.getElementById("phoneInfo");

        if (!phone) {
            alert("Please enter a mobile number to verify.");
            return;
        }

        if (!/^\d{10}$/.test(phone)) {
            alert("Please enter a valid 10-digit mobile number.");
            return;
        }

        phoneInfo.textContent = "Checking mobile number...";
        phoneInfo.style.color = "#4b5563";

        try {
            const res = await apiRequest('/auth/verify-phone', {
                method: 'POST',
                body: JSON.stringify({ phone, role })
            });

            phoneInfo.textContent = `✓ Account verified: ${res.name} (${res.role.toUpperCase()}) - ${res.maskedEmail}`;
            phoneInfo.style.color = "#16a34a";
        } catch (err) {
            const users = getUsers();
            const user = users.find(u => u.phone && String(u.phone).trim() === phone && (role === "all" || u.role === role));
            if (user) {
                phoneInfo.textContent = `✓ Account verified: ${user.name} (${user.role.toUpperCase()})`;
                phoneInfo.style.color = "#16a34a";
            } else {
                phoneInfo.textContent = "✗ No registered account found with this mobile number.";
                phoneInfo.style.color = "#dc2626";
            }
        }
    });
}

if (document.getElementById("forgotPasswordForm")) {
    document.getElementById("forgotPasswordForm").addEventListener("submit", async function (e) {
        e.preventDefault();

        const role = document.getElementById("resetRole").value;
        const phone = document.getElementById("resetPhone").value.trim();
        const newPassword = document.getElementById("newPassword").value.trim();
        const confirmPassword = document.getElementById("confirmPassword").value.trim();
        const statusAlert = document.getElementById("statusAlert");

        function showAlert(msg, isSuccess = false) {
            if (statusAlert) {
                statusAlert.textContent = msg;
                statusAlert.className = `alert-box ${isSuccess ? 'alert-success' : 'alert-error'}`;
                statusAlert.style.display = 'block';
            } else {
                alert(msg);
            }
        }

        if (!phone) {
            showAlert("Please enter your registered mobile number.");
            return;
        }

        if (!/^\d{10}$/.test(phone)) {
            showAlert("Please enter a valid 10-digit mobile number.");
            return;
        }

        if (newPassword.length < 4) {
            showAlert("Password must be at least 4 characters long.");
            return;
        }

        if (newPassword !== confirmPassword) {
            showAlert("Passwords do not match. Please re-enter.");
            return;
        }

        try {
            const res = await apiRequest('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ phone, role, newPassword })
            });

            showAlert(res.message || "Password reset successfully! Redirecting to login...", true);
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1800);
        } catch (error) {
            // Local fallback
            const users = getUsers();
            const userIndex = users.findIndex(
                u => u.phone && String(u.phone).trim() === phone && (role === "all" || u.role === role)
            );

            if (userIndex !== -1) {
                users[userIndex].password = newPassword;
                saveUsers(users);
                showAlert("Password reset successfully! Redirecting to login...", true);
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1800);
            } else {
                showAlert(error.message || "No registered account found with this mobile number.");
            }
        }
    });
}

// ========================================================
// THEME & DARK MODE
// ========================================================
function initTheme() {
    const savedTheme = localStorage.getItem('school_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeToggleBtn(true);
    }
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('school_theme', isDark ? 'dark' : 'light');
    updateThemeToggleBtn(isDark);
}

function updateThemeToggleBtn(isDark) {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
    }
}

document.addEventListener('DOMContentLoaded', initTheme);

// ========================================================
// 1. STUDENT DASHBOARD
// ========================================================
async function initStudentDashboard() {
    const user = getCurrentUser();
    if (!user || user.role !== "student") {
        window.location.href = "../index.html";
        return;
    }

    initTheme();
    document.getElementById("welcomeMessage").textContent = `Welcome Back, ${user.name}!`;

    try {
        const data = await apiRequest('/student/dashboard');
        
        if (document.getElementById("studentSubtitle") && data.student) {
            document.getElementById("studentSubtitle").textContent = 
                `${data.student.course} • ${data.student.semester} • Roll: ${data.student.rollNo}`;
        }

        if (document.getElementById("statAttendance")) {
            document.getElementById("statAttendance").textContent = data.stats.attendanceRate;
        }
        if (document.getElementById("statGPA")) {
            document.getElementById("statGPA").textContent = data.stats.gpa;
        }
        if (document.getElementById("statPendingFees")) {
            document.getElementById("statPendingFees").textContent = `₹${data.stats.pendingFees.toLocaleString()}`;
        }
        if (document.getElementById("statAssignments")) {
            document.getElementById("statAssignments").textContent = data.stats.pendingAssignments;
        }

        // AI Advisor
        if (document.getElementById("aiAdvisorText") && data.aiSuggestions && data.aiSuggestions.length) {
            document.getElementById("aiAdvisorText").textContent = data.aiSuggestions[0].text;
        }

        // Render Charts with Chart.js
        renderDashboardCharts(data);

        // Render urgent assignments
        const assignList = document.getElementById("dashboardAssignmentsList");
        if (assignList && data.assignments) {
            assignList.innerHTML = data.assignments.map(a => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color);">
                    <div>
                        <strong style="display: block; font-size: 0.95rem;">${a.title}</strong>
                        <small style="color: var(--text-muted);">${a.subject} • Due: ${a.dueDate}</small>
                    </div>
                    <span class="badge ${a.status === 'Submitted' ? 'badge-success' : 'badge-warning'}">${a.status}</span>
                </div>
            `).join("");
        }

        // Render Notices
        const noticeList = document.getElementById("noticeList");
        if (noticeList && data.notices) {
            noticeList.innerHTML = data.notices.map(n => `
                <li>
                    <strong>${n.title}</strong>
                    <p>${n.message}</p>
                    <small>${new Date(n.date).toLocaleDateString()}</small>
                </li>
            `).join("");
        }
    } catch (err) {
        console.warn("API offline or error, using local mock data:", err);
    }
}

function renderDashboardCharts(data) {
    const attCanvas = document.getElementById('attendanceChart');
    if (attCanvas && window.Chart) {
        const attRate = (data.stats && data.stats.attendanceRaw) || 87.5;
        new Chart(attCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Present (%)', 'Absent (%)'],
                datasets: [{
                    data: [attRate, (100 - attRate).toFixed(1)],
                    backgroundColor: ['#10b981', '#f43f5e'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    const marksCanvas = document.getElementById('marksChart');
    if (marksCanvas && window.Chart) {
        new Chart(marksCanvas, {
            type: 'bar',
            data: {
                labels: ['Algorithms', 'DBMS', 'OS', 'Web Tech', 'Discrete Math'],
                datasets: [{
                    label: 'Score (out of 100)',
                    data: [89, 88, 78, 95, 80],
                    backgroundColor: '#3b82f6',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100 }
                }
            }
        });
    }
}

// ========================================================
// 2. STUDENT PROFILE & QR ID CARD
// ========================================================
async function initStudentProfile() {
    const user = getCurrentUser();
    if (!user || user.role !== "student") {
        window.location.href = "../index.html";
        return;
    }
    initTheme();

    try {
        const data = await apiRequest('/student/profile');
        
        document.getElementById("profName").textContent = data.name;
        document.getElementById("profRoll").textContent = data.rollNo;
        document.getElementById("profEmail").textContent = data.email;
        document.getElementById("profPhone").textContent = data.phone;
        document.getElementById("profCourse").textContent = data.course;
        document.getElementById("profSemester").textContent = data.semester;
        document.getElementById("profDOB").textContent = data.dateOfBirth;
        document.getElementById("profBlood").textContent = data.bloodGroup;
        document.getElementById("profAddress").textContent = data.address;
        document.getElementById("profGuardianName").textContent = data.guardianName;
        document.getElementById("profGuardianPhone").textContent = data.guardianPhone;

        // Populate ID Card
        document.getElementById("idCardName").textContent = data.name;
        document.getElementById("idCardRoll").textContent = data.rollNo;
        document.getElementById("idCardCourse").textContent = data.course;
        document.getElementById("idCardBlood").textContent = data.bloodGroup;
        document.getElementById("idCardPhone").textContent = data.phone;

        // Generate QR Code
        const qrContainer = document.getElementById("studentQRCode");
        if (qrContainer && window.QRCode) {
            qrContainer.innerHTML = "";
            new QRCode(qrContainer, {
                text: JSON.stringify({
                    id: data.id,
                    name: data.name,
                    rollNo: data.rollNo,
                    course: data.course,
                    validTill: "2028-06-30"
                }),
                width: 90,
                height: 90,
                colorDark: "#0f172a",
                colorLight: "#ffffff"
            });
        }
    } catch (e) {
        console.warn("Profile load error:", e);
    }
}

function openEditProfileModal() {
    const modal = document.getElementById("editProfileModal");
    if (modal) modal.style.display = "flex";

    document.getElementById("editName").value = document.getElementById("profName").textContent;
    document.getElementById("editPhone").value = document.getElementById("profPhone").textContent;
    document.getElementById("editAddress").value = document.getElementById("profAddress").textContent;
    document.getElementById("editGuardian").value = document.getElementById("profGuardianName").textContent;
    document.getElementById("editGuardianPhone").value = document.getElementById("profGuardianPhone").textContent;
}

function closeEditProfileModal() {
    const modal = document.getElementById("editProfileModal");
    if (modal) modal.style.display = "none";
}

if (document.getElementById("editProfileForm")) {
    document.getElementById("editProfileForm").addEventListener("submit", async function(e) {
        e.preventDefault();
        const payload = {
            name: document.getElementById("editName").value.trim(),
            phone: document.getElementById("editPhone").value.trim(),
            dateOfBirth: document.getElementById("editDOB").value,
            bloodGroup: document.getElementById("editBlood").value,
            address: document.getElementById("editAddress").value.trim(),
            guardianName: document.getElementById("editGuardian").value.trim(),
            guardianPhone: document.getElementById("editGuardianPhone").value.trim()
        };

        try {
            await apiRequest('/student/profile', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            alert("Profile updated successfully!");
            closeEditProfileModal();
            initStudentProfile();
        } catch (error) {
            alert(error.message);
        }
    });
}

// ========================================================
// 3. COURSES & SUBJECTS
// ========================================================
let allStudentCourses = [];

async function initStudentCourses() {
    initTheme();
    try {
        const res = await apiRequest('/student/courses');
        allStudentCourses = res.courses || [];
        renderCoursesCards(allStudentCourses);
    } catch (e) {
        console.warn(e);
    }
}

function renderCoursesCards(courses) {
    const grid = document.getElementById("courseCardsGrid");
    if (!grid) return;

    if (!courses.length) {
        grid.innerHTML = "<p>No matching courses found.</p>";
        return;
    }

    grid.innerHTML = courses.map(c => `
        <div class="panel" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <span class="badge badge-primary">${c.code}</span>
                    <span style="font-weight: 700; color: var(--primary-blue); font-size: 0.88rem;">${c.credits} Credits</span>
                </div>
                <h3 style="margin: 6px 0 10px 0;">${c.title}</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 14px;">
                    👨‍🏫 Faculty: <strong>${c.faculty}</strong>
                </p>

                <div style="margin-bottom: 14px;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
                        <span>Syllabus Covered</span>
                        <strong>${c.syllabusProgress}%</strong>
                    </div>
                    <div style="background: var(--bg-secondary); height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${c.syllabusProgress}%; background: var(--primary-gradient); height: 100%;"></div>
                    </div>
                </div>

                <div style="font-size: 0.84rem; color: var(--text-muted);">
                    <strong>Key Modules:</strong>
                    <ul style="padding-left: 18px; margin: 4px 0 0 0;">
                        ${c.modules.slice(0, 3).map(m => `<li>${m}</li>`).join("")}
                    </ul>
                </div>
            </div>
            <div style="margin-top: 18px; border-top: 1px solid var(--border-color); padding-top: 12px; display: flex; justify-content: space-between;">
                <a href="study-material.html" class="forgot-link">📖 Study Notes</a>
                <a href="assignments.html" class="forgot-link">📂 Assignments</a>
            </div>
        </div>
    `).join("");
}

function filterCourses() {
    const q = (document.getElementById("courseSearchInput").value || "").toLowerCase();
    const filtered = allStudentCourses.filter(c => 
        c.title.toLowerCase().includes(q) || 
        c.code.toLowerCase().includes(q) || 
        c.faculty.toLowerCase().includes(q)
    );
    renderCoursesCards(filtered);
}

// ========================================================
// 4. ATTENDANCE TRACKER & CSV EXPORT
// ========================================================
let allAttendanceRecords = [];

async function initStudentAttendance() {
    initTheme();
    try {
        const res = await apiRequest('/attendance');
        const user = getCurrentUser();
        allAttendanceRecords = res.filter(item => !item.email || item.email === user.email);

        if (!allAttendanceRecords.length) {
            allAttendanceRecords = [
                { id: 1, date: "2026-08-15", subject: "Design & Analysis of Algorithms", status: "Present" },
                { id: 2, date: "2026-08-15", subject: "Database Management Systems", status: "Present" },
                { id: 3, date: "2026-08-14", subject: "Operating Systems", status: "Absent" },
                { id: 4, date: "2026-08-14", subject: "Web Technologies", status: "Present" },
                { id: 5, date: "2026-08-13", subject: "Discrete Mathematics", status: "Present" }
            ];
        }

        renderAttendanceTable(allAttendanceRecords);
        renderSubjectAttendanceChart();
    } catch (e) {
        console.warn(e);
    }
}

function renderAttendanceTable(records) {
    const tbody = document.getElementById("attendanceTableBody");
    if (!tbody) return;

    if (!records.length) {
        tbody.innerHTML = '<tr><td colspan="5">No records found.</td></tr>';
        return;
    }

    tbody.innerHTML = records.map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${r.date ? new Date(r.date).toLocaleDateString() : 'N/A'}</td>
            <td><strong>${r.subject}</strong></td>
            <td>
                <span class="badge ${r.status === 'Present' ? 'badge-success' : 'badge-danger'}">
                    ${r.status}
                </span>
            </td>
            <td>${r.status === 'Present' ? 'Regular Lecture' : 'Medical Leave Applied'}</td>
        </tr>
    `).join("");
}

function filterAttendanceTable() {
    const q = (document.getElementById("attSearchInput").value || "").toLowerCase();
    const filtered = allAttendanceRecords.filter(r =>
        (r.subject && r.subject.toLowerCase().includes(q)) ||
        (r.date && r.date.toLowerCase().includes(q))
    );
    renderAttendanceTable(filtered);
}

function renderSubjectAttendanceChart() {
    const canvas = document.getElementById("attSubjectChart");
    if (canvas && window.Chart) {
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: ['Algorithms', 'DBMS', 'OS', 'Web Tech', 'Discrete Math'],
                datasets: [{
                    label: 'Attendance Rate (%)',
                    data: [92, 88, 80, 95, 76],
                    backgroundColor: ['#10b981', '#10b981', '#10b981', '#10b981', '#f59e0b'],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100 }
                }
            }
        });
    }
}

function exportAttendanceCSV() {
    let csv = "Index,Date,Subject,Status\n";
    allAttendanceRecords.forEach((r, i) => {
        csv += `${i + 1},"${r.date}","${r.subject}","${r.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Student_Attendance_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// ========================================================
// 5. MARKS & REPORT CARD
// ========================================================
async function initStudentMarks() {
    initTheme();
    try {
        const data = await apiRequest('/student/marks');
        window.currentStudentReportCard = data;
        
        document.getElementById("marksSGPA").textContent = data.sgpa;
        document.getElementById("marksCGPA").textContent = data.cgpa;

        if (document.getElementById("rcName")) document.getElementById("rcName").textContent = data.student.name;
        if (document.getElementById("rcRoll")) document.getElementById("rcRoll").textContent = data.student.rollNo;
        if (document.getElementById("rcCourse")) document.getElementById("rcCourse").textContent = data.student.course;
        if (document.getElementById("rcSem")) document.getElementById("rcSem").textContent = data.student.semester;

        const tbody = document.getElementById("marksTableBody");
        if (tbody && data.marks) {
            tbody.innerHTML = data.marks.map(m => `
                <tr>
                    <td><strong>${m.code}</strong></td>
                    <td>${m.subject}</td>
                    <td>${m.internal}/20</td>
                    <td>${m.assignment}/10</td>
                    <td>${m.practical}/20</td>
                    <td>${m.finalExam}/50</td>
                    <td><strong>${m.total}/100</strong></td>
                    <td><span class="badge ${m.grade.includes('A') ? 'badge-success' : 'badge-primary'}">${m.grade}</span></td>
                    <td>${m.credits}</td>
                </tr>
            `).join("");
        }
    } catch (e) {
        console.warn(e);
    }
}

function downloadReportCardPDF() {
    const jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) return alert("PDF library is not available. Please reload the page and try again.");
    const report = window.currentStudentReportCard;
    if (!report || !report.marks) return alert("Report card data is not loaded yet.");

    const doc = new jsPDF();
    if (typeof doc.autoTable !== "function") return alert("PDF table plugin is not available. Please reload the page and try again.");
    doc.setFontSize(16);
    doc.text("Student Report Card", 14, 18);
    doc.setFontSize(10);
    doc.text(`Student: ${report.student.name}`, 14, 28);
    doc.text(`Roll No: ${report.student.rollNo}`, 14, 34);
    doc.text(`Course: ${report.student.course}`, 14, 40);
    doc.text(`Semester: ${report.student.semester}`, 14, 46);
    doc.autoTable({
        startY: 54,
        head: [["Code", "Subject", "Internal", "Assignment", "Practical", "Final", "Total", "Grade", "Credits"]],
        body: report.marks.map(mark => [
            mark.code, mark.subject, `${mark.internal}/20`, `${mark.assignment}/10`,
            `${mark.practical}/20`, `${mark.finalExam}/50`, `${mark.total}/100`,
            mark.grade, mark.credits
        ])
    });
    doc.save(`Report_Card_${String(report.student.rollNo || "student").replace(/[^a-z0-9_-]/gi, "_")}.pdf`);
}

// ========================================================
// 6. TIMETABLE
// ========================================================
let weeklyScheduleData = {};

async function initStudentTimetable() {
    initTheme();
    try {
        const res = await apiRequest('/student/timetable');
        weeklyScheduleData = res.timetable || {};
        switchTimetableDay('Monday');
    } catch (e) {
        console.warn(e);
    }
}

function switchTimetableDay(day) {
    const tabs = document.querySelectorAll("#dayTabsNav .tab-btn");
    tabs.forEach(t => {
        t.classList.toggle("active", t.textContent.trim() === day);
    });

    document.getElementById("currentDayTitle").textContent = `📅 ${day}'s Schedule`;
    const slots = weeklyScheduleData[day] || [];
    document.getElementById("totalClassesCount").textContent = `${slots.length} Classes Scheduled`;

    const container = document.getElementById("timetableSlotsContainer");
    if (!container) return;

    if (!slots.length) {
        container.innerHTML = "<p>No lectures scheduled for this day.</p>";
        return;
    }

    container.innerHTML = slots.map(s => `
        <div class="timetable-card-slot">
            <div>
                <span class="time-badge">⏰ ${s.time}</span>
                <h4 style="margin: 8px 0 4px 0; font-size: 1.1rem;">${s.subject} (${s.code})</h4>
                <small style="color: var(--text-muted);">👨‍🏫 Faculty: <strong>${s.teacher}</strong></small>
            </div>
            <div>
                <span class="badge badge-info" style="font-size: 0.9rem; padding: 8px 14px;">📍 Room: ${s.room}</span>
            </div>
        </div>
    `).join("");
}

// ========================================================
// 7. ASSIGNMENTS & SUBMISSION
// ========================================================
let allStudentAssignments = [];

async function initStudentAssignments() {
    initTheme();
    try {
        const res = await apiRequest('/student/assignments');
        allStudentAssignments = res.assignments || [];
        filterAssignments('all');
    } catch (e) {
        console.warn(e);
    }
}

function filterAssignments(status) {
    const tabs = document.querySelectorAll(".tabs-nav .tab-btn");
    tabs.forEach(t => {
        if (status === 'all') {
            t.classList.toggle("active", t.textContent.includes("All"));
        } else {
            t.classList.toggle("active", t.textContent.includes(status));
        }
    });

    const filtered = status === 'all' 
        ? allStudentAssignments 
        : allStudentAssignments.filter(a => a.status === status);

    const container = document.getElementById("assignmentsCardsContainer");
    if (!container) return;

    if (!filtered.length) {
        container.innerHTML = "<p>No assignments found in this category.</p>";
        return;
    }

    container.innerHTML = filtered.map(a => `
        <div class="panel" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span class="badge ${a.status === 'Graded' ? 'badge-success' : (a.status === 'Submitted' ? 'badge-info' : 'badge-warning')}">
                        ${a.status}
                    </span>
                    <span style="font-size: 0.85rem; font-weight: 700; color: #ef4444;">⏳ Due: ${a.dueDate}</span>
                </div>
                <h3 style="margin: 8px 0 6px 0;">${a.title}</h3>
                <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 12px;">
                    Subject: <strong>${a.subject}</strong> • Max Marks: <strong>${a.totalMarks}</strong>
                </p>
                <p style="font-size: 0.9rem; line-height: 1.4; color: var(--text-main); margin-bottom: 14px;">
                    ${a.description}
                </p>

                ${a.feedback ? `
                    <div style="background: var(--bg-secondary); padding: 10px; border-radius: 8px; font-size: 0.85rem; border-left: 3px solid #10b981; margin-bottom: 12px;">
                        <strong>Score: ${a.score}/${a.totalMarks}</strong><br>
                        <em>Teacher Feedback: "${a.feedback}"</em>
                    </div>
                ` : ''}
            </div>

            <div style="border-top: 1px solid var(--border-color); padding-top: 14px; display: flex; justify-content: space-between; align-items: center;">
                <a href="#download" onclick="alert('Downloading ${a.downloadFile || 'assignment.pdf'}...')" class="forgot-link">📥 Question Sheet</a>
                ${a.status === 'Pending' ? `
                    <button class="primary-btn" onclick="openSubmitModal(${a.id}, '${a.title}', '${a.subject}')" style="width: auto; padding: 6px 14px;">📤 Submit Solution</button>
                ` : `
                    <span style="font-size: 0.84rem; color: #10b981; font-weight: 600;">✓ Submitted</span>
                `}
            </div>
        </div>
    `).join("");
}

function openSubmitModal(id, title, subject) {
    document.getElementById("modalAssignmentId").value = id;
    document.getElementById("modalAssignmentTitle").textContent = `Submit: ${title}`;
    document.getElementById("modalAssignmentSubject").textContent = `Subject: ${subject}`;
    document.getElementById("submitAssignmentModal").style.display = "flex";
}

function closeSubmitModal() {
    document.getElementById("submitAssignmentModal").style.display = "none";
}

if (document.getElementById("submitAssignmentForm")) {
    document.getElementById("submitAssignmentForm").addEventListener("submit", async function(e) {
        e.preventDefault();
        const id = document.getElementById("modalAssignmentId").value;
        const submissionNote = document.getElementById("submissionNotes").value.trim();
        const fileInput = document.getElementById("submissionFile");
        try {
            if (!fileInput.files.length) throw new Error("Please choose the assignment file to upload.");
            const uploadBody = new FormData();
            uploadBody.append("file", fileInput.files[0]);
            const uploadResponse = await fetch(`${API_BASE_URL}/upload/assignment`, {
                method: "POST",
                headers: { Authorization: `Bearer ${getToken()}` },
                body: uploadBody
            });
            const uploadedFile = await uploadResponse.json();
            if (!uploadResponse.ok) throw new Error(uploadedFile.message || "File upload failed.");
            await apiRequest(`/student/assignments/${id}/submit`, {
                method: 'POST',
                body: JSON.stringify({ submissionNote, fileName: uploadedFile.fileName, fileUrl: uploadedFile.fileUrl })
            });

            alert("Assignment submitted successfully!");
            closeSubmitModal();
            initStudentAssignments();
        } catch (err) {
            alert(err.message);
        }
    });
}

// ========================================================
// 8. EXAMINATIONS & ADMIT CARD
// ========================================================
async function initStudentExams() {
    initTheme();
    try {
        const data = await apiRequest('/student/exams');
        
        const tbody = document.getElementById("examScheduleTableBody");
        if (tbody && data.exams) {
            tbody.innerHTML = data.exams.map(e => `
                <tr>
                    <td><strong>${e.date}</strong></td>
                    <td>${e.time}</td>
                    <td><span class="badge badge-primary">${e.code}</span></td>
                    <td>${e.subject}</td>
                    <td><strong>${e.room}</strong></td>
                    <td><span class="badge badge-info">${e.seatNo}</span></td>
                    <td>${e.duration}</td>
                </tr>
            `).join("");
        }

        if (data.admitCard) {
            document.getElementById("admitName").textContent = data.admitCard.studentName;
            document.getElementById("admitRoll").textContent = data.admitCard.rollNo;
            document.getElementById("admitCourse").textContent = data.admitCard.course;
            document.getElementById("admitSem").textContent = data.admitCard.semester;

            const qrContainer = document.getElementById("admitQRCode");
            if (qrContainer && window.QRCode) {
                qrContainer.innerHTML = "";
                new QRCode(qrContainer, {
                    text: `ADMIT-CARD-VERIFIED:${data.admitCard.rollNo}:AUTUMN2026`,
                    width: 80,
                    height: 80,
                    colorDark: "#0f172a",
                    colorLight: "#ffffff"
                });
            }
        }
    } catch (e) {
        console.warn(e);
    }
}

// ========================================================
// 9. FEES & PAYMENTS
// ========================================================
let allStudentTransactions = [];
let activeFeeReceipt = null;

async function initStudentFees() {
    initTheme();
    try {
        const data = await apiRequest('/student/fees');
        
        document.getElementById("feeTotalAmount").textContent = `₹${data.summary.totalFees.toLocaleString()}`;
        document.getElementById("feePaidAmount").textContent = `₹${data.summary.paidFees.toLocaleString()}`;
        document.getElementById("feePendingAmount").textContent = `₹${data.summary.pendingFees.toLocaleString()}`;
        document.getElementById("payAmountInput").value = data.summary.pendingFees;
        document.getElementById("payAmountInput").max = data.summary.pendingFees;
        document.getElementById("btnPayAmountText").textContent = data.summary.pendingFees.toLocaleString();
        const fullyPaid = data.summary.pendingFees <= 0;
        document.getElementById("payRazorpayBtn").disabled = fullyPaid;
        document.getElementById("quickPayBtn").disabled = fullyPaid;
        document.querySelector("#onlinePaymentForm button[type='submit']").disabled = fullyPaid;

        const compTbody = document.getElementById("feeComponentsTableBody");
        if (compTbody && data.components) {
            compTbody.innerHTML = data.components.map(c => `
                <tr>
                    <td>${c.name}</td>
                    <td>₹${c.amount.toLocaleString()}</td>
                    <td><span class="badge ${c.status === 'Paid' ? 'badge-success' : 'badge-warning'}">${c.status}</span></td>
                </tr>
            `).join("");
        }

        allStudentTransactions = data.transactions || [];
        const txnTbody = document.getElementById("transactionsTableBody");
        if (txnTbody) {
            txnTbody.innerHTML = allStudentTransactions.length ? allStudentTransactions.map(t => `
                <tr>
                    <td><strong>${t.txnId}</strong></td>
                    <td>${t.date}</td>
                    <td>${t.category}</td>
                    <td>${t.method}</td>
                    <td><strong>₹${t.amount.toLocaleString()}</strong></td>
                    <td><span class="badge badge-success">${t.status}</span></td>
                    <td>
                        <button class="secondary-btn" style="padding: 4px 10px; font-size: 0.82rem;" onclick="viewReceipt('${t.txnId}', '${t.receiptNo}', '${t.date}', '${t.method}', ${t.amount})">
                            🧾 View Receipt
                        </button>
                    </td>
                </tr>
            `).join("") : '<tr><td colspan="7">No verified payments recorded yet.</td></tr>';
        }
    } catch (e) {
        const container = document.getElementById("feeComponentsTableBody");
        if (container) container.innerHTML = `<tr><td colspan="3">${e.message}</td></tr>`;
    }
}

function openPayFeeModal() {
    if (Number(document.getElementById("payAmountInput").max) <= 0) {
        return alert("There is no outstanding fee balance to pay.");
    }
    document.getElementById("payFeeModal").style.display = "flex";
}

function openRazorpayPaymentModal() {
    if (Number(document.getElementById("payAmountInput").max) <= 0) {
        return alert("There is no outstanding fee balance to pay.");
    }
    document.getElementById("paymentMethodSelect").value = "Razorpay";
    document.getElementById("payFeeModal").style.display = "flex";
}

function closePayFeeModal() {
    document.getElementById("payFeeModal").style.display = "none";
}

function togglePaymentInputs() {
    const method = document.getElementById("paymentMethodSelect").value;
    document.getElementById("upiFieldGroup").style.display = method === "UPI" ? "block" : "none";
    document.getElementById("cardFieldGroup").style.display = method.includes("Card") ? "block" : "none";
}

if (document.getElementById("payAmountInput")) {
    document.getElementById("payAmountInput").addEventListener("input", function() {
        document.getElementById("btnPayAmountText").textContent = Number(this.value || 0).toLocaleString();
    });
}

if (document.getElementById("onlinePaymentForm")) {
    document.getElementById("onlinePaymentForm").addEventListener("submit", async function(e) {
        e.preventDefault();
        const amount = Number(document.getElementById("payAmountInput").value);
        try {
            if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Enter a valid whole-rupee amount.");
            if (!window.Razorpay) throw new Error("Razorpay Checkout could not be loaded. Check your internet connection.");
            const order = await apiRequest('/fees/create-razorpay-order', {
                method: 'POST',
                body: JSON.stringify({ amount })
            });

            const checkout = new window.Razorpay({
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                name: "School Management",
                description: "Semester fee payment",
                order_id: order.orderId,
                prefill: { name: order.studentName, email: order.studentEmail },
                handler: async function (paymentResponse) {
                    try {
                        const verified = await apiRequest('/fees/verify-payment', {
                            method: 'POST',
                            body: JSON.stringify(paymentResponse)
                        });
                        closePayFeeModal();
                        await initStudentFees();
                        viewReceipt(
                            verified.transaction.txnId,
                            verified.receipt.receiptNo,
                            verified.transaction.date,
                            verified.transaction.method,
                            verified.transaction.amount
                        );
                    } catch (error) {
                        alert(`Payment verification failed: ${error.message}`);
                    }
                },
                modal: { ondismiss: function () {} },
                theme: { color: "#2563eb" }
            });
            checkout.on("payment.failed", response => {
                alert(`Payment failed: ${response.error.description || response.error.reason || "Please try again."}`);
            });
            checkout.open();
        } catch (err) {
            alert(err.message);
        }
    });
}

function viewReceipt(txnId, recNo, date, method, amount) {
    const user = getCurrentUser();
    activeFeeReceipt = { txnId, receiptNo: recNo, date, method, amount: Number(amount), user };
    document.getElementById("recNo").textContent = recNo;
    document.getElementById("recTxnId").textContent = txnId;
    document.getElementById("recStudentName").textContent = user ? user.name : "Student One";
    document.getElementById("recRollNo").textContent = user && user.rollNo ? user.rollNo : "—";
    document.getElementById("recDate").textContent = date;
    document.getElementById("recMethod").textContent = method;
    document.getElementById("recAmount").textContent = `₹${Number(amount).toLocaleString()}`;
    
    document.getElementById("printableReceiptBox").style.display = "block";
    document.getElementById("printableReceiptBox").scrollIntoView({ behavior: 'smooth' });
}

function downloadActiveFeeReceiptPDF() {
    const jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) return alert("PDF library is not available. Please reload the page and try again.");
    if (!activeFeeReceipt) return alert("Select a verified transaction before downloading its receipt.");
    const { doc, receiptNo, txnId, date, method, amount, user } = {
        doc: new jsPDF(),
        ...activeFeeReceipt
    };
    doc.setFontSize(16);
    doc.text("Official Fee Payment Receipt", 14, 20);
    doc.setFontSize(11);
    doc.text("School Management", 14, 30);
    doc.text(`Receipt No: ${receiptNo}`, 14, 44);
    doc.text(`Transaction ID: ${txnId}`, 14, 52);
    doc.text(`Student: ${user ? user.name : "Student"}`, 14, 60);
    doc.text(`Roll No: ${user && user.rollNo ? user.rollNo : "—"}`, 14, 68);
    doc.text(`Payment date: ${date}`, 14, 76);
    doc.text(`Payment method: ${method}`, 14, 84);
    doc.setFontSize(13);
    doc.text(`Amount paid: INR ${Number(amount).toLocaleString("en-IN")}`, 14, 98);
    doc.text("Status: PAID", 14, 108);
    doc.save(`Fee_Receipt_${String(receiptNo).replace(/[^a-z0-9_-]/gi, "_")}.pdf`);
}

// ========================================================
// 10. NOTIFICATIONS
// ========================================================
let allStudentNotifications = [
    { id: 1, title: "Mid-Term Examination Schedule Released", category: "Exam", date: "2026-08-15", message: "The Autumn 2026 exam dates have been uploaded. Download your admit cards." },
    { id: 2, title: "Semester 4 Remaining Fee Reminder", category: "Fee", date: "2026-08-14", message: "Last date to clear semester dues without penalty is September 15, 2026." },
    { id: 3, title: "Attendance Warning Notice", category: "Attendance", date: "2026-08-12", message: "Students with attendance below 75% are advised to submit leave regularization forms." },
    { id: 4, title: "Campus Hackathon & Tech Fest 2026", category: "College", date: "2026-08-10", message: "Registrations open for the annual 48-hour Inter-College Hackathon." }
];

function initStudentNotifications() {
    initTheme();
    const socket = openRealtimeSocket();
    if (socket) {
        socket.off("notice_published");
        socket.on("notice_published", notice => {
            allStudentNotifications.unshift({
                id: `live-${Date.now()}`,
                title: notice.title,
                category: "College",
                date: notice.createdAt || new Date().toISOString(),
                message: notice.message
            });
            renderNotificationsList(allStudentNotifications);
        });
    }
    renderNotificationsList(allStudentNotifications);
}

function renderNotificationsList(notifs) {
    const container = document.getElementById("notificationsListContainer");
    if (!container) return;

    if (!notifs.length) {
        container.innerHTML = "<p>No notifications found.</p>";
        return;
    }

    container.innerHTML = notifs.map(n => `
        <div class="panel" style="margin-bottom: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="badge ${n.category === 'Exam' ? 'badge-danger' : (n.category === 'Fee' ? 'badge-warning' : 'badge-primary')}">
                    ${n.category} Alert
                </span>
                <small style="color: var(--text-muted);">${n.date}</small>
            </div>
            <h3 style="margin: 0 0 6px 0;">${n.title}</h3>
            <p style="margin: 0; color: var(--text-muted); line-height: 1.5;">${n.message}</p>
        </div>
    `).join("");
}

function filterNotifications(cat) {
    const filtered = cat === 'all' ? allStudentNotifications : allStudentNotifications.filter(n => n.category === cat);
    renderNotificationsList(filtered);
}

function searchNotifications() {
    const q = (document.getElementById("notifSearchInput").value || "").toLowerCase();
    const filtered = allStudentNotifications.filter(n => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q));
    renderNotificationsList(filtered);
}

function markAllNotificationsRead() {
    alert("All notifications marked as read!");
}

// ========================================================
// 11. STUDY MATERIAL
// ========================================================
let allStudyMaterials = [];

async function initStudentStudyMaterials() {
    initTheme();
    try {
        const res = await apiRequest('/student/study-materials');
        allStudyMaterials = res.materials || [];
        filterMaterials('all');
    } catch (e) {
        console.warn(e);
    }
}

function filterMaterials(type) {
    const filtered = type === 'all' ? allStudyMaterials : allStudyMaterials.filter(m => m.type === type);
    const grid = document.getElementById("materialsGrid");
    if (!grid) return;

    if (!filtered.length) {
        grid.innerHTML = "<p>No study materials found.</p>";
        return;
    }

    grid.innerHTML = filtered.map(m => `
        <div class="panel" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span class="badge ${m.type === 'Video' ? 'badge-danger' : (m.type === 'PYQ' ? 'badge-warning' : 'badge-primary')}">${m.type}</span>
                    <small style="color: var(--text-muted);">${m.size || m.duration}</small>
                </div>
                <h3 style="margin: 0 0 6px 0; font-size: 1.1rem;">${m.title}</h3>
                <p style="color: var(--text-muted); font-size: 0.88rem; margin: 0 0 10px 0;">
                    Subject: <strong>${m.subject}</strong> (${m.code})<br>
                    Uploaded by: ${m.uploadedBy}
                </p>
            </div>
            <div style="border-top: 1px solid var(--border-color); padding-top: 14px; display: flex; justify-content: space-between; align-items: center;">
                <small style="color: var(--text-muted);">${m.date}</small>
                <a href="${m.link}" ${m.type === 'Video' ? 'target="_blank"' : ''} onclick="${m.type !== 'Video' ? "alert('Downloading document: " + m.title + "'); return false;" : ''}" class="primary-btn" style="width: auto; padding: 6px 14px; font-size: 0.85rem;">
                    ${m.type === 'Video' ? '▶️ Watch Video' : '📥 Download File'}
                </a>
            </div>
        </div>
    `).join("");
}

function searchStudyMaterials() {
    const q = (document.getElementById("materialSearchInput").value || "").toLowerCase();
    const filtered = allStudyMaterials.filter(m => 
        m.title.toLowerCase().includes(q) || 
        m.subject.toLowerCase().includes(q) || 
        m.code.toLowerCase().includes(q)
    );
    const grid = document.getElementById("materialsGrid");
    if (grid) {
        grid.innerHTML = filtered.map(m => `
            <div class="panel">
                <span class="badge badge-primary">${m.type}</span>
                <h3 style="margin: 8px 0;">${m.title}</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem;">${m.subject} • ${m.uploadedBy}</p>
                <a href="${m.link}" class="forgot-link">📥 Access Material →</a>
            </div>
        `).join("");
    }
}

// ========================================================
// 12. DOUBTS & MESSAGES
// ========================================================
async function initStudentDoubts() {
    initTheme();
    try {
        const res = await apiRequest('/student/doubts');
        const socket = openRealtimeSocket();
        if (socket) {
            socket.off("doubt_answered");
            socket.on("doubt_answered", () => initStudentDoubts());
        }
        const container = document.getElementById("doubtsThreadContainer");
        if (!container) return;

        const doubts = res.doubts || [];
        if (!doubts.length) {
            container.innerHTML = "<p>No doubt inquiries recorded yet.</p>";
            return;
        }

        container.innerHTML = doubts.map(d => `
            <div class="panel" style="margin-bottom: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span class="badge ${d.status === 'Answered' ? 'badge-success' : 'badge-warning'}">${d.status}</span>
                    <small style="color: var(--text-muted);">${new Date(d.date).toLocaleDateString()}</small>
                </div>
                <h4 style="margin: 0 0 6px 0; color: var(--primary-blue);">${d.subject} (Faculty: ${d.teacher})</h4>
                <p style="font-weight: 600; margin: 0 0 8px 0;">❓ "${d.question}"</p>
                ${d.reply ? `
                    <div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px; border-left: 3px solid #10b981; font-size: 0.9rem;">
                        <strong>👨‍🏫 Faculty Reply:</strong>
                        <p style="margin: 4px 0 0 0;">${d.reply}</p>
                    </div>
                ` : `
                    <small style="color: var(--text-muted);">Awaiting response from faculty...</small>
                `}
            </div>
        `).join("");
    } catch (e) {
        console.warn(e);
    }
}

function openAskDoubtModal() {
    document.getElementById("askDoubtModal").style.display = "flex";
}

function closeAskDoubtModal() {
    document.getElementById("askDoubtModal").style.display = "none";
}

if (document.getElementById("askDoubtForm")) {
    document.getElementById("askDoubtForm").addEventListener("submit", async function(e) {
        e.preventDefault();
        const subject = document.getElementById("doubtSubject").value;
        const question = document.getElementById("doubtQuestion").value.trim();
        const user = getCurrentUser();

        try {
            await apiRequest('/student/doubts', {
                method: 'POST',
                body: JSON.stringify({
                    subject,
                    question,
                    studentName: user ? user.name : "Student",
                    studentId: user ? user.id : null
                })
            });

            alert("Doubt sent to teacher successfully!");
            closeAskDoubtModal();
            initStudentDoubts();
        } catch (err) {
            alert(err.message);
        }
    });
}

// ========================================================
// 13. CERTIFICATES & DOCUMENTS
// ========================================================
async function initStudentDocuments() {
    initTheme();
    try {
        const res = await apiRequest('/student/documents');
        const tbody = document.getElementById("documentsTableBody");
        if (!tbody) return;

        const docs = res.documents || [];
        tbody.innerHTML = docs.map(d => `
            <tr>
                <td><strong>${d.id}</strong></td>
                <td>${d.title}</td>
                <td><span class="badge badge-info">${d.type}</span></td>
                <td>${d.issueDate}</td>
                <td><span class="badge ${d.status === 'Issued' || d.status === 'Approved' ? 'badge-success' : 'badge-warning'}">${d.status}</span></td>
                <td>
                    <button class="secondary-btn" style="padding: 4px 12px; font-size: 0.85rem;" onclick="viewDocument('${d.type}')">
                        📄 View / Print
                    </button>
                </td>
            </tr>
        `).join("");
    } catch (e) {
        console.warn(e);
    }
}

function openRequestDocModal() {
    document.getElementById("requestDocModal").style.display = "flex";
}

function closeRequestDocModal() {
    document.getElementById("requestDocModal").style.display = "none";
}

if (document.getElementById("requestDocForm")) {
    document.getElementById("requestDocForm").addEventListener("submit", async function(e) {
        e.preventDefault();
        const docType = document.getElementById("docTypeSelect").value;
        const purpose = document.getElementById("docPurpose").value.trim();

        try {
            await apiRequest('/student/documents/request', {
                method: 'POST',
                body: JSON.stringify({ docType, purpose })
            });

            alert("Certificate application submitted successfully!");
            closeRequestDocModal();
            initStudentDocuments();
        } catch (err) {
            alert(err.message);
        }
    });
}

function viewDocument(type) {
    if (type === 'ID Card') {
        window.location.href = "profile.html";
    } else {
        const box = document.getElementById("printableCertBox");
        if (box) {
            box.style.display = "block";
            box.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// ========================================================
// 14. LEAVE MANAGEMENT
// ========================================================
async function initStudentLeaves() {
    initTheme();
    try {
        const res = await apiRequest('/student/leaves');
        const tbody = document.getElementById("leavesTableBody");
        if (!tbody) return;

        const leaves = res.leaves || [];
        tbody.innerHTML = leaves.map(l => `
            <tr>
                <td><strong>${l.type}</strong></td>
                <td>${l.fromDate}</td>
                <td>${l.toDate}</td>
                <td>${l.reason}</td>
                <td>${l.appliedOn}</td>
                <td><span class="badge ${l.status === 'Approved' ? 'badge-success' : (l.status === 'Rejected' ? 'badge-danger' : 'badge-warning')}">${l.status}</span></td>
                <td><small>${l.approverComment || 'Under Review'}</small></td>
            </tr>
        `).join("");
    } catch (e) {
        console.warn(e);
    }
}

function openApplyLeaveModal() {
    document.getElementById("applyLeaveModal").style.display = "flex";
}

function closeApplyLeaveModal() {
    document.getElementById("applyLeaveModal").style.display = "none";
}

if (document.getElementById("applyLeaveForm")) {
    document.getElementById("applyLeaveForm").addEventListener("submit", async function(e) {
        e.preventDefault();
        const type = document.getElementById("leaveTypeSelect").value;
        const fromDate = document.getElementById("leaveFromDate").value;
        const toDate = document.getElementById("leaveToDate").value;
        const reason = document.getElementById("leaveReason").value.trim();

        try {
            await apiRequest('/student/leaves', {
                method: 'POST',
                body: JSON.stringify({ type, fromDate, toDate, reason })
            });

            alert("Leave application submitted successfully!");
            closeApplyLeaveModal();
            initStudentLeaves();
        } catch (err) {
            alert(err.message);
        }
    });
}

// ========================================================
// 15. STUDENT FEEDBACK
// ========================================================
async function initStudentFeedback() {
    initTheme();
    try {
        const res = await apiRequest('/student/feedback');
        const container = document.getElementById("feedbackListContainer");
        if (!container) return;

        const feedbacks = res.feedbacks || [
            { category: "Teacher Feedback", targetName: "Dr. Arvind Rao (Algorithms)", rating: 5, comments: "Extremely clear explanations of asymptotic complexity and dynamic programming.", submittedAt: "2026-08-01" },
            { category: "College Feedback", targetName: "Central Library", rating: 4, comments: "Great e-resources collection, requested more study cubicles.", submittedAt: "2026-07-20" }
        ];

        container.innerHTML = feedbacks.map(f => `
            <div style="background: var(--bg-secondary); padding: 14px; border-radius: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span class="badge badge-primary">${f.category}</span>
                    <span style="color: #f59e0b; font-weight: 700;">${'⭐'.repeat(f.rating)}</span>
                </div>
                <strong>${f.targetName}</strong>
                <p style="margin: 4px 0 0 0; font-size: 0.88rem; color: var(--text-muted);">"${f.comments}"</p>
            </div>
        `).join("");
    } catch (e) {
        console.warn(e);
    }
}

if (document.getElementById("studentFeedbackForm")) {
    document.getElementById("studentFeedbackForm").addEventListener("submit", async function(e) {
        e.preventDefault();
        const category = document.getElementById("feedbackCategory").value;
        const targetName = document.getElementById("feedbackTarget").value.trim();
        const rating = document.getElementById("feedbackRating").value;
        const comments = document.getElementById("feedbackComments").value.trim();

        try {
            await apiRequest('/student/feedback', {
                method: 'POST',
                body: JSON.stringify({ category, targetName, rating, comments })
            });

            alert("Thank you! Your feedback was recorded.");
            document.getElementById("studentFeedbackForm").reset();
            initStudentFeedback();
        } catch (err) {
            alert(err.message);
        }
    });
}

async function renderTeacherDashboard() {
    const user = getCurrentUser();
    if (!user || user.role !== "teacher") {
        window.location.href = "../index.html";
        return;
    }

    document.getElementById("welcomeMessage").textContent = "Welcome, " + user.name;

    try {
        const [students, marks, attendance, notices, doubts] = await Promise.all([
            apiRequest('/users/students'),
            apiRequest('/marks'),
            apiRequest('/attendance'),
            apiRequest('/notices'),
            apiRequest('/student/doubts')
        ]);

        document.getElementById("totalStudents").textContent = students.length;
        document.getElementById("totalSubjects").textContent = new Set(marks.map(item => item.subject)).size || 0;
        const validAttendance = attendance.filter(item => item.status === "Present" || item.status === "present");
        const attendanceRate = attendance.length ? Math.round(validAttendance.length * 100 / attendance.length) : 0;
        const attendanceSummary = document.getElementById("classAttendanceAverage");
        if (attendanceSummary) attendanceSummary.textContent = `${attendanceRate}%`;
        const attendanceStatus = document.getElementById("attendanceTargetStatus");
        if (attendanceStatus) attendanceStatus.textContent = attendanceRate >= 75 ? "Above 75% target" : "Below 75% target";
        const pendingDoubts = Array.isArray(doubts.doubts) ? doubts.doubts.filter(item => item.status !== "Answered") : [];
        const doubtsCount = document.getElementById("pendingDoubtsCount");
        if (doubtsCount) doubtsCount.textContent = pendingDoubts.length;
        if (window.updateTeacherDashboardCharts) window.updateTeacherDashboardCharts(attendance, marks);
        if (window.renderTeacherDoubts) window.renderTeacherDoubts(doubts.doubts || []);

        const noticeList = document.getElementById("noticeList");
        if (noticeList) {
            noticeList.innerHTML = notices.map(notice => `
                <li>
                    <strong>${notice.title}</strong>
                    <p>${notice.message}</p>
                </li>
            `).join("");
        }
        const socket = openRealtimeSocket();
        if (socket) {
            const badge = document.getElementById("facultySocketBadge");
            socket.on("connect", () => {
                badge.className = "badge badge-success";
                badge.textContent = "🟢 Real-Time Active";
            });
            socket.on("disconnect", () => {
                badge.className = "badge badge-warning";
                badge.textContent = "🟠 Reconnecting";
            });
            socket.on("doubt_received", doubt => {
                if (window.addTeacherDoubt) window.addTeacherDoubt(doubt);
            });
            socket.on("notice_published", notice => {
                if (!noticeList) return;
                const item = document.createElement("li");
                const title = document.createElement("strong");
                const message = document.createElement("p");
                title.textContent = notice.title;
                message.textContent = notice.message;
                item.append(title, message);
                noticeList.prepend(item);
            });
        }
    } catch (error) {
        alert(error.message);
    }
}

async function renderTeacherAttendancePage() {
    const user = getCurrentUser();
    if (!user || user.role !== "teacher") {
        window.location.href = "../index.html";
        return;
    }

    const tbody = document.querySelector("#attendanceTable tbody");
    if (!tbody) return;

    try {
        const students = await apiRequest('/users/students');
        tbody.innerHTML = students.map(student => `
            <tr data-email="${student.email}" data-name="${student.name}">
                <td>${student.name}</td>
                <td>
                    <select>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                    </select>
                </td>
            </tr>
        `).join("");

        const saveBtn = document.getElementById("saveAttendanceBtn");
        if (saveBtn) {
            saveBtn.onclick = async function () {
                const subject = document.getElementById("attendanceSubject").value.trim();
                if (!subject) {
                    alert("Please enter a subject name.");
                    return;
                }

                const rows = [...document.querySelectorAll("#attendanceTable tbody tr")];

                try {
                    for (const row of rows) {
                        await apiRequest('/attendance', {
                            method: 'POST',
                            body: JSON.stringify({
                                email: row.dataset.email,
                                name: row.dataset.name,
                                subject,
                                status: row.querySelector("select").value
                            })
                        });
                    }

                    alert("Attendance Saved Successfully!");
                    renderTeacherAttendancePage();
                } catch (error) {
                    alert(error.message);
                }
            };
        }
    } catch (error) {
        alert(error.message);
    }
}

async function renderTeacherMarksPage() {
    const user = getCurrentUser();
    if (!user || user.role !== "teacher") {
        window.location.href = "../index.html";
        return;
    }

    const tbody = document.querySelector("#marksTable tbody");
    if (!tbody) return;

    try {
        const students = await apiRequest('/users/students');
        tbody.innerHTML = students.map(student => `
            <tr data-email="${student.email}" data-name="${student.name}">
                <td>${student.name}</td>
                <td>
                    <input type="text" id="subject-${student.email}" placeholder="Subject" value="Math">
                </td>
                <td>
                    <input type="number" min="0" max="100" id="marks-${student.email}" placeholder="Enter marks">
                </td>
            </tr>
        `).join("");

        const saveBtn = document.getElementById("saveMarksBtn");
        if (saveBtn) {
            saveBtn.onclick = async function () {
                const rows = [...document.querySelectorAll("#marksTable tbody tr")];
                const payloads = rows.map(row => {
                    const email = row.dataset.email;
                    const name = row.dataset.name;
                    const subject = document.getElementById("subject-" + email).value.trim();
                    const marks = document.getElementById("marks-" + email).value;

                    if (!subject || marks === "") {
                        return null;
                    }

                    return {
                        email,
                        name,
                        subject,
                        marks: Number(marks)
                    };
                }).filter(Boolean);

                if (!payloads.length) {
                    alert("Please enter at least one valid subject and mark.");
                    return;
                }

                try {
                    for (const item of payloads) {
                        await apiRequest('/marks', {
                            method: 'POST',
                            body: JSON.stringify(item)
                        });
                    }

                    alert("Marks Saved Successfully!");
                    renderTeacherMarksPage();
                } catch (error) {
                    alert(error.message);
                }
            };
        }
    } catch (error) {
        alert(error.message);
    }
}

async function renderAdminDashboard() {
    const user = getCurrentUser();
    if (!user || user.role !== "admin") {
        window.location.href = "../index.html";
        return;
    }

    document.getElementById("welcomeMessage").textContent = "Welcome, " + user.name;

    try {
        const students = await apiRequest('/users/students');
        const teachers = await apiRequest('/users/teachers');
        const users = await apiRequest('/users');
        const notices = await apiRequest('/notices');

        document.getElementById("totalStudents").textContent = students.length;
        document.getElementById("totalTeachers").textContent = teachers.length;
        document.getElementById("totalUsers").textContent = users.length;

        const noticeList = document.getElementById("noticeList");
        if (noticeList) {
            noticeList.innerHTML = notices.map(notice => `
                <li>
                    <strong>${notice.title}</strong>
                    <p>${notice.message}</p>
                    <small>${new Date(notice.date).toLocaleDateString()}</small>
                </li>
            `).join("");
        }
    } catch (error) {
        alert(error.message);
    }
}

async function renderAdminUsers() {
    const user = getCurrentUser();
    if (!user || user.role !== "admin") {
        window.location.href = "../index.html";
        return;
    }

    const tbody = document.querySelector("#userTable tbody");
    if (!tbody) return;

    try {
        const users = await apiRequest('/users');
        tbody.innerHTML = users.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.email}</td>
                <td>${item.role}</td>
                <td>
                    <button class="danger-btn" data-user-id="${item.id}">Delete</button>
                </td>
            </tr>
        `).join("");

        const deleteButtons = document.querySelectorAll("[data-user-id]");
        deleteButtons.forEach(button => {
            button.addEventListener("click", async function () {
                const id = this.getAttribute("data-user-id");
                try {
                    await apiRequest(`/users/${id}`, { method: 'DELETE' });
                    renderAdminUsers();
                } catch (error) {
                    alert(error.message);
                }
            });
        });

        const form = document.getElementById("userForm");
        if (form) {
            form.onsubmit = async function (e) {
                e.preventDefault();
                const name = document.getElementById("userName").value.trim();
                const email = document.getElementById("userEmail").value.trim();
                const password = document.getElementById("userPassword").value.trim();
                const role = document.getElementById("userRole").value;

                if (!name || !email || !password) {
                    alert("Please fill in all user fields.");
                    return;
                }

                try {
                    await apiRequest('/users', {
                        method: 'POST',
                        body: JSON.stringify({ name, email, password, role })
                    });
                    form.reset();
                    renderAdminUsers();
                    alert("User added successfully!");
                } catch (error) {
                    alert(error.message);
                }
            };
        }
    } catch (error) {
        alert(error.message);
    }
}

function renderAdminNoticeForm() {
    const user = getCurrentUser();
    if (!user || user.role !== "admin") {
        window.location.href = "../index.html";
        return;
    }

    const form = document.getElementById("noticeForm");
    if (!form) return;

    form.onsubmit = async function (e) {
        e.preventDefault();
        const title = document.getElementById("noticeTitle").value.trim();
        const message = document.getElementById("noticeMessage").value.trim();

        if (!title || !message) {
            alert("Please fill in the notice title and message.");
            return;
        }

        try {
            await apiRequest('/notices', {
                method: 'POST',
                body: JSON.stringify({ title, message })
            });
            form.reset();
            renderAdminDashboard();
            alert("Notice published successfully!");
        } catch (error) {
            alert(error.message);
        }
    };
}

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const login = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;

        try {
            const response = await fetch("api/login.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    login: login,
                    password: password
                })
            });

            const result = await response.json();

            if (result.success) {
                localStorage.setItem("loggedInUser", JSON.stringify(result.user));

                alert("Login successful!");

                window.location.href = "dashboard.html";
            } else {
                alert(result.message);
            }

        } catch (error) {
            console.error(error);
            alert("Server connection failed.");
        }
    });
}