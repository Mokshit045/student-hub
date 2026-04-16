// ===== CONFIGURATION =====
// Automatically detects the backend URL
const BACKEND_URL = window.location.origin;
const API_BASE = `${BACKEND_URL}/api/students`;
let currentPage = 1;
let deleteTargetId = null;
let debounceTimer = null;

// ===== AVATAR COLORS =====
const avatarColors = [
    ['#6366f1', '#818cf8'], ['#a855f7', '#c084fc'], ['#0ea5e9', '#38bdf8'],
    ['#22c55e', '#4ade80'], ['#f59e0b', '#fbbf24'], ['#ef4444', '#f87171'],
];
function getAvatarColor(str) {
    let hash = 0;
    for (let c of str) hash = c.charCodeAt(0) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
}
function makeAvatar(name, size = 38) {
    const [from, to] = getAvatarColor(name || 'X');
    const letter = (name || '?')[0].toUpperCase();
    return `<div class="student-avatar" style="background:linear-gradient(135deg,${from},${to});width:${size}px;height:${size}px">${letter}</div>`;
}

// ===== NAVIGATION =====
function navigateTo(page) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const el = document.getElementById(`page-${page}`);
    const nav = document.getElementById(`nav-${page}`);
    if (el) el.classList.remove('hidden');
    if (nav) nav.classList.add('active');
    document.getElementById('pageTitle').textContent =
        page === 'dashboard' ? 'Dashboard' : page === 'students' ? 'All Students' : page === 'admin' ? 'Admin Contact' : 'Add Student';
    if (page === 'dashboard') loadDashboard();
    if (page === 'students') loadStudents();
    if (page === 'add') resetForm();
    // Close sidebar on mobile
    if (window.innerWidth <= 900) document.getElementById('sidebar').classList.remove('mobile-open');
}

// Nav click listeners
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(item.dataset.page);
    });
});

// Sidebar toggle (desktop)
document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
});

// Mobile sidebar
document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('mobile-open');
});

// ===== TOAST =====
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = type === 'success' ? '✅' : '❌';
    document.getElementById('toastMsg').textContent = message;
    toast.querySelector('.toast-icon').textContent = icon;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}

// ===== SERVER HEALTH =====
async function checkHealth() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/health`);
        const data = await res.json();
        const dot = document.querySelector('.status-dot');
        const text = document.querySelector('.status-text');
        if (data.success) {
            dot.classList.add('online'); dot.classList.remove('offline');
            text.textContent = 'Server Online';
        }
    } catch {
        const dot = document.querySelector('.status-dot');
        dot.classList.add('offline'); dot.classList.remove('online');
        document.querySelector('.status-text').textContent = 'Server Offline';
    }
}

// ===== DASHBOARD =====
async function loadDashboard() {
    try {
        const res = await fetch(`${API_BASE}/stats/summary?_t=${Date.now()}`);
        const { stats } = await res.json();
        document.getElementById('totalStudents').textContent = stats.total;
        document.getElementById('activeStudents').textContent = stats.active;
        document.getElementById('totalDepts').textContent = stats.byDept.length;
        document.getElementById('avgGpa').textContent = stats.avgGpa;

        // Dept chart
        const deptEl = document.getElementById('deptChart');
        const maxDept = Math.max(...stats.byDept.map(d => d.count), 1);
        deptEl.innerHTML = stats.byDept.length ? stats.byDept.slice(0, 6).map(d => `
      <div class="chart-bar-row">
        <span class="chart-bar-label" title="${d._id}">${d._id}</span>
        <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${(d.count / maxDept * 100).toFixed(1)}%"></div></div>
        <span class="chart-bar-count">${d.count}</span>
      </div>
    `).join('') : '<p style="color:var(--text-muted);font-size:0.85rem">No data yet</p>';

        // Year chart
        const yearEl = document.getElementById('yearChart');
        const maxYear = Math.max(...stats.byYear.map(y => y.count), 1);
        const yearNames = ['', '1st Year', '2nd Year', '3rd Year', '4th Year'];
        yearEl.innerHTML = stats.byYear.length ? stats.byYear.map(y => `
      <div class="chart-bar-row">
        <span class="chart-bar-label">${yearNames[y._id] || `Year ${y._id}`}</span>
        <div class="chart-bar-track"><div class="chart-bar-fill year-bar-fill" style="width:${(y.count / maxYear * 100).toFixed(1)}%"></div></div>
        <span class="chart-bar-count">${y.count}</span>
      </div>
    `).join('') : '<p style="color:var(--text-muted);font-size:0.85rem">No data yet</p>';
    } catch (err) {
        showToast('Failed to load dashboard data', 'error');
    }
}

// ===== STUDENTS LIST =====
async function loadStudents(page = 1) {
    currentPage = page;
    const search = document.getElementById('searchInput').value.trim();
    const dept = document.getElementById('filterDept').value;
    const year = document.getElementById('filterYear').value;
    const status = document.getElementById('filterStatus').value;

    const params = new URLSearchParams({ page, limit: 10, _t: Date.now() });
    if (search) params.set('search', search);
    if (dept) params.set('department', dept);
    if (year) params.set('year', year);
    if (status) params.set('status', status);

    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><div class="loader"></div></td></tr>`;

    try {
        const res = await fetch(`${API_BASE}?${params}`);
        const data = await res.json();
        renderTable(data.students);
        renderPagination(data.pages, data.currentPage);
    } catch {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Failed to load students</td></tr>`;
    }
}

function renderTable(students) {
    const tbody = document.getElementById('studentsTableBody');
    if (!students.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No students found</td></tr>`;
        return;
    }
    tbody.innerHTML = students.map(s => {
        const badgeClass = { Active: 'badge-active', Inactive: 'badge-inactive', Graduated: 'badge-graduated', Suspended: 'badge-suspended' }[s.status] || 'badge-inactive';
        return `
    <tr onclick="viewStudent('${s.id}')">
      <td>
        <div class="student-cell">
          ${makeAvatar(s.name)}
          <div class="student-info">
            <div class="student-name">${escHtml(s.name)}</div>
            <div class="student-email">${escHtml(s.email)}</div>
          </div>
        </div>
      </td>
      <td>${escHtml(s.rollNumber)}</td>
      <td>${escHtml(s.department)}</td>
      <td>Year ${s.year}</td>
      <td><span class="gpa-value">${s.gpa || '—'}</span></td>
      <td><span class="badge ${badgeClass}">${s.status}</span></td>
      <td>
        <div class="action-btns" onclick="event.stopPropagation()">
          <button class="icon-btn view-btn" title="View" onclick="viewStudent('${s.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="icon-btn edit-btn" title="Edit" onclick="editStudent('${s.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn del-btn" title="Delete" onclick="openDeleteModal('${s.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
    }).join('');
}

function renderPagination(pages, current) {
    const el = document.getElementById('pagination');
    if (pages <= 1) { el.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= pages; i++) {
        html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="loadStudents(${i})">${i}</button>`;
    }
    el.innerHTML = html;
}

// Debounced search
document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => loadStudents(1), 400);
});
['filterDept', 'filterYear', 'filterStatus'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => loadStudents(1));
});

// ===== VIEW STUDENT =====
async function viewStudent(id) {
    try {
        const res = await fetch(`${API_BASE}/${id}?_t=${Date.now()}`);
        const { student: s } = await res.json();
        const [from, to] = getAvatarColor(s.name);
        const badgeClass = { Active: 'badge-active', Inactive: 'badge-inactive', Graduated: 'badge-graduated', Suspended: 'badge-suspended' }[s.status] || '';
        document.getElementById('studentDetailContent').innerHTML = `
      <div class="detail-header">
        <div class="detail-avatar" style="background:linear-gradient(135deg,${from},${to})">${s.name[0].toUpperCase()}</div>
        <div>
          <div class="detail-name">${escHtml(s.name)}</div>
          <div class="detail-sub">${escHtml(s.email)} · Roll No: ${escHtml(s.rollNumber)}</div>
          <span class="badge ${badgeClass}" style="margin-top:8px;display:inline-block">${s.status}</span>
        </div>
      </div>
      <div class="detail-body">
        <div class="detail-item"><label>Department</label><p>${escHtml(s.department)}</p></div>
        <div class="detail-item"><label>Year</label><p>Year ${s.year}</p></div>
        <div class="detail-item"><label>Gender</label><p>${escHtml(s.gender)}</p></div>
        <div class="detail-item"><label>GPA</label><p>${s.gpa || '—'}</p></div>
        <div class="detail-item"><label>Phone</label><p>${escHtml(s.phone || '—')}</p></div>
        <div class="detail-item"><label>Joined</label><p>${new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
        ${s.address ? `<div class="detail-item" style="grid-column:1/-1"><label>Address</label><p>${escHtml(s.address)}</p></div>` : ''}
      </div>
    `;
        document.getElementById('viewModal').classList.remove('hidden');
    } catch {
        showToast('Could not load student details', 'error');
    }
}
function closeViewModal() { document.getElementById('viewModal').classList.add('hidden'); }

// ===== EDIT STUDENT =====
async function editStudent(id) {
    try {
        const res = await fetch(`${API_BASE}/${id}?_t=${Date.now()}`);
        const { student: s } = await res.json();
        resetForm();
        navigateTo('add');
        document.getElementById('studentId').value = s.id;
        document.getElementById('formTitle').textContent = 'Edit Student';
        document.getElementById('formSubtitle').textContent = 'Update the student details below';
        document.getElementById('submitBtn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg> Update Student`;
        ['name', 'email', 'rollNumber', 'phone', 'department', 'year', 'gender', 'gpa', 'status', 'address'].forEach(f => {
            const el = document.getElementById(f);
            if (el) el.value = s[f] ?? '';
        });
    } catch {
        showToast('Could not load student for editing', 'error');
    }
}

// ===== FORM SUBMIT =====
document.getElementById('studentForm').addEventListener('submit', async e => {
    e.preventDefault();
    clearErrors();
    const id = document.getElementById('studentId').value;
    const body = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        rollNumber: document.getElementById('rollNumber').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        department: document.getElementById('department').value,
        year: Number(document.getElementById('year').value),
        gender: document.getElementById('gender').value,
        gpa: Number(document.getElementById('gpa').value) || 0,
        status: document.getElementById('status').value,
        address: document.getElementById('address').value.trim(),
    };

    // Client validation
    let valid = true;
    if (!body.name) { setError('nameError', 'Name is required'); valid = false; }
    if (!body.email) { setError('emailError', 'Email is required'); valid = false; }
    if (!body.rollNumber) { setError('rollNumberError', 'Roll number is required'); valid = false; }
    if (!body.department) { setError('departmentError', 'Please select a department'); valid = false; }
    if (!body.year) { setError('yearError', 'Please select a year'); valid = false; }
    if (!body.gender) { setError('genderError', 'Please select gender'); valid = false; }
    if (!valid) return;

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = `<div class="loader" style="width:18px;height:18px;border-width:2px;margin:0"></div> Saving...`;

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE}/${id}` : API_BASE;
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (data.success) {
            showToast(data.message, 'success');
            navigateTo('students');
        } else {
            showToast(data.message || 'Something went wrong', 'error');
        }
    } catch {
        showToast('Network error. Is the server running?', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg> Save Student`;
    }
});

// ===== DELETE =====
function openDeleteModal(id) {
    deleteTargetId = id;
    document.getElementById('deleteModal').classList.remove('hidden');
}
function closeDeleteModal() {
    deleteTargetId = null;
    document.getElementById('deleteModal').classList.add('hidden');
}
document.getElementById('confirmDelete').addEventListener('click', async () => {
    if (!deleteTargetId) return;
    try {
        const res = await fetch(`${API_BASE}/${deleteTargetId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast(data.message, 'success');
            closeDeleteModal();
            loadStudents(currentPage);
        } else {
            showToast(data.message || 'Delete failed', 'error');
        }
    } catch {
        showToast('Network error', 'error');
    }
});

// ===== ADMIN CONTACT FORM =====
document.getElementById('adminContactForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalBtnHtml = btn.innerHTML;

    const body = {
        name: document.getElementById('contact-name').value.trim(),
        email: document.getElementById('contact-email').value.trim(),
        message: document.getElementById('contact-msg').value.trim(),
    };

    btn.disabled = true;
    btn.innerHTML = `<div class="loader" style="width:18px;height:18px;border-width:2px;margin:0"></div> Sending...`;

    try {
        const res = await fetch(`${BACKEND_URL}/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) {
            showToast(data.message, 'success');
            e.target.reset();
        } else {
            showToast(data.message || 'Failed to send message', 'error');
        }
    } catch {
        showToast('Network error. Is the server running?', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
    }
});

// Close modals on backdrop click
document.getElementById('deleteModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeDeleteModal(); });
document.getElementById('viewModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeViewModal(); });

// ===== HELPERS =====
function resetForm() {
    document.getElementById('studentForm').reset();
    document.getElementById('studentId').value = '';
    document.getElementById('formTitle').textContent = 'Add New Student';
    document.getElementById('formSubtitle').textContent = 'Fill in the details below to register a new student';
    document.getElementById('submitBtn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg> Save Student`;
    clearErrors();
}
function clearErrors() {
    document.querySelectorAll('.field-error').forEach(e => e.textContent = '');
}
function setError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
}
function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== INIT =====
checkHealth();
navigateTo('dashboard');
