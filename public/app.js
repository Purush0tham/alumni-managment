/**
 * Alumni Management System - app.js
 * Shared frontend logic: API calls, utilities, dashboard loader
 */

const API = 'http://localhost:3000/api';

/* API Helpers */

async function fetchAlumni() {
  try {
    const res = await fetch(`${API}/alumni`);
    if (!res.ok) throw new Error('Server error');
    return await res.json();
  } catch (e) {
    console.error('fetchAlumni:', e);
    return getMockData(); // Fallback to demo data when server is offline
  }
}

async function addAlumni(data) {
  try {
    const res = await fetch(`${API}/alumni`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch (e) {
    console.error('addAlumni:', e);
    // Demo mode: store in localStorage
    demoAdd(data);
    return true;
  }
}

async function updateAlumni(id, data) {
  try {
    const res = await fetch(`${API}/alumni/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch (e) {
    console.error('updateAlumni:', e);
    demoUpdate(id, data);
    return true;
  }
}

async function removeAlumni(id) {
  try {
    const res = await fetch(`${API}/alumni/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (e) {
    console.error('removeAlumni:', e);
    demoRemove(id);
    return true;
  }
}

/* Demo / Mock Data (when server is offline) */

function getMockData() {
  const stored = localStorage.getItem('alumni_demo');
  if (stored) return JSON.parse(stored);
  const defaults = [
    { id: 1, name: 'Khan Ahmed',    email: 'khan@gmail.com',    phone: '9876543210', course: 'BCA',    graduation_year: 2025 },
    { id: 2, name: 'Priya Sharma',  email: 'priya@gmail.com',   phone: '9876543211', course: 'MCA',    graduation_year: 2024 },
    { id: 3, name: 'Rohan Verma',   email: 'rohan@gmail.com',   phone: '9876543212', course: 'B.Tech', graduation_year: 2023 },
    { id: 4, name: 'Sneha Kulkarni',email: 'sneha@gmail.com',   phone: '9876543213', course: 'BCA-AI', graduation_year: 2025 },
    { id: 5, name: 'Arjun Mehta',   email: 'arjun@gmail.com',   phone: '9876543214', course: 'MCA',    graduation_year: 2022 },
  ];
  localStorage.setItem('alumni_demo', JSON.stringify(defaults));
  return defaults;
}

function demoAdd(data) {
  const list = getMockData();
  const newId = list.length ? Math.max(...list.map(a => a.id)) + 1 : 1;
  list.push({ id: newId, ...data });
  localStorage.setItem('alumni_demo', JSON.stringify(list));
}

function demoUpdate(id, data) {
  let list = getMockData();
  list = list.map(a => a.id == id ? { ...a, ...data } : a);
  localStorage.setItem('alumni_demo', JSON.stringify(list));
}

function demoRemove(id) {
  let list = getMockData();
  list = list.filter(a => a.id != id);
  localStorage.setItem('alumni_demo', JSON.stringify(list));
}

/* UI Utilities */

function showAlert(targetId, message, type = 'success') {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.textContent = message;
  el.className = `form-alert ${type}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

function clearForm() {
  ['f_name', 'f_email', 'f_phone', 'f_course', 'f_year'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  if (typeof updateSQLPreview === 'function') updateSQLPreview();
}

async function submitAlumni() {
  const name  = document.getElementById('f_name').value.trim();
  const email = document.getElementById('f_email').value.trim();
  const phone = document.getElementById('f_phone').value.trim();
  const course = document.getElementById('f_course').value.trim();
  const year  = document.getElementById('f_year').value.trim();

  if (!name) { showAlert('formAlert', 'Name is required.', 'error'); return; }
  if (!course) { showAlert('formAlert', 'Course is required.', 'error'); return; }
  if (!year) { showAlert('formAlert', 'Graduation year is required.', 'error'); return; }

  const ok = await addAlumni({ name, email, phone, course, graduation_year: parseInt(year) });
  if (ok) {
    showAlert('formAlert', `Alumni "${name}" added successfully!`, 'success');
    clearForm();
  } else {
    showAlert('formAlert', 'Failed to add alumni. Check server connection.', 'error');
  }
}

/* Dashboard Loader */

async function loadDashboard() {
  const data = await fetchAlumni();

  // Stats
  document.getElementById('totalCount').textContent = data.length;

  const courses = new Set(data.map(a => a.course).filter(Boolean));
  document.getElementById('courseCount').textContent = courses.size;

  const years = data.map(a => a.graduation_year).filter(Boolean);
  document.getElementById('latestYear').textContent = years.length ? Math.max(...years) : '-';

  // Simulate "this week" for demo mode by showing the last 2 entries.
  document.getElementById('weekCount').textContent = Math.min(data.length, 2);

  // Recent 5
  const recent = [...data].reverse().slice(0, 5);
  const body = document.getElementById('recentBody');
  if (!recent.length) {
    body.innerHTML = `<tr><td colspan="5" class="empty-cell"><div class="empty-state"><span class="empty-icon"><svg viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M5 12h14"/></svg></span><strong>No records found</strong><a href="add.html" style="color:var(--primary); font-weight:700;">Add one</a></div></td></tr>`;
    return;
  }
  body.innerHTML = recent.map((a, i) => `
    <tr class="table-row-anim" style="animation-delay:${i * 0.06}s">
      <td class="mono">${a.id}</td>
      <td><strong>${a.name}</strong></td>
      <td><span class="badge">${a.course || '-'}</span></td>
      <td class="mono">${a.graduation_year || '-'}</td>
      <td><a href="view.html" class="tbl-btn tbl-edit" style="display:inline-flex; padding:0 11px;">View</a></td>
    </tr>`).join('');
}
