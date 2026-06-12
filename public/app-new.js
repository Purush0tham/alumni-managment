/**
 * Alumni Management System — Updated app.js
 * Professional Engineering College Alumni Portal
 */

// ===== DATA STRUCTURES =====

const DEPARTMENT_MAP = {
  BE: ['Computer Science Engineering (CSE)', 'Artificial Intelligence & Machine Learning (AIML)', 'Information Science Engineering (ISE)', 'Electronics & Communication Engineering (ECE)', 'Electrical & Electronics Engineering (EEE)', 'Mechanical Engineering', 'Civil Engineering'],
  BTech: ['Computer Science Engineering (CSE)', 'Artificial Intelligence & Machine Learning (AIML)', 'Information Science Engineering (ISE)', 'Electronics & Communication Engineering (ECE)', 'Electrical & Electronics Engineering (EEE)', 'Mechanical Engineering', 'Civil Engineering'],
  MTech: ['Computer Science', 'AI & ML', 'Data Science', 'VLSI Design', 'Structural Engineering'],
  MCA: ['Computer Applications'],
  MBA: ['Finance', 'Marketing', 'Human Resources', 'Business Analytics']
};

const GRADUATION_YEARS = Array.from({ length: 16 }, (_, i) => 2020 + i);

const chartColors = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5', '--chart-6'];

const pageTitles = {
  dashboard: "Dashboard",
  records: "All Records",
  add: "Add Alumni",
  search: "Search"
};

// ===== STATE =====

let allAlumni = [];
let filteredRecords = [];
let dashboardStats = {};
let currentPage = "dashboard";
let pendingDeleteId = null;
let chartLoadWarningShown = false;
let currentSession = null;

const chartInstances = {
  department: null,
  course: null,
  year: null
};

const els = {};

// ===== INITIALIZATION =====

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }
  currentSession = session;

  const userEmailEl = document.getElementById('userEmail');
  if (userEmailEl && session.user?.email) {
    userEmailEl.textContent = session.user.email;
  }

  const email = session.user?.email || '';
  const userAvatarEl = document.getElementById('userAvatar');
  const userEmailDisplayEl = document.getElementById('userEmailDisplay');
  if (userAvatarEl && email) {
    userAvatarEl.textContent = email[0].toUpperCase();
  }
  if (userEmailDisplayEl && email) {
    userEmailDisplayEl.textContent = email;
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentSession = session;
    if (!session) window.location.href = 'login.html';
  });

  cacheElements();
  populateGraduationYears();
  bindEvents();
  navigate("dashboard");
});

function cacheElements() {
  // Navigation
  els.pages = document.querySelectorAll(".page");
  els.navItems = document.querySelectorAll(".nav-item");
  els.topbarTitle = document.getElementById("topbarTitle");
  els.globalSearch = document.getElementById("globalSearch");
  els.connectionDot = document.getElementById("connectionDot");
  els.toastRoot = document.getElementById("toastRoot");
  els.chartTooltip = document.getElementById("chartTooltip");

  // Dashboard Stats
  els.statTotal = document.getElementById("statTotal");
  els.statCourses = document.getElementById("statCourses");
  els.statDepartments = document.getElementById("statDepartments");
  els.statLatestYear = document.getElementById("statLatestYear");

  // Dashboard Charts
  els.deptChartCard = document.getElementById("deptChartCard");
  els.yearChartCard = document.getElementById("yearChartCard");
  els.courseChartCard = document.getElementById("courseChartCard");
  els.deptChart = document.getElementById("deptChart");
  els.deptLegend = document.getElementById("deptLegend");
  els.courseChart = document.getElementById("courseChart");
  els.yearChart = document.getElementById("yearChart");
  els.recentRecords = document.getElementById("recentRecords");

  // Records Page
  els.recordFilter = document.getElementById("recordFilter");
  els.courseFilter = document.getElementById("courseFilter");
  els.yearFilter = document.getElementById("yearFilter");
  els.exportBtn = document.getElementById("exportBtn");
  els.recordsBody = document.getElementById("recordsBody");

  // Add Form
  els.addForm = document.getElementById("addForm");
  els.addBanner = document.getElementById("addBanner");
  els.clearFormBtn = document.getElementById("clearFormBtn");
  els.usnInput = document.getElementById("usnInput");
  els.nameInput = document.getElementById("nameInput");
  els.emailInput = document.getElementById("emailInput");
  els.phoneInput = document.getElementById("phoneInput");
  els.courseInput = document.getElementById("courseInput");
  els.departmentInput = document.getElementById("departmentInput");
  els.yearInput = document.getElementById("yearInput");
  els.cityInput = document.getElementById("cityInput");

  // Search
  els.searchBtn = document.getElementById("searchBtn");
  els.searchName = document.getElementById("searchName");
  els.searchUSN = document.getElementById("searchUSN");
  els.searchCourse = document.getElementById("searchCourse");
  els.searchDepartment = document.getElementById("searchDepartment");
  els.searchYear = document.getElementById("searchYear");
  els.searchBody = document.getElementById("searchBody");
  els.searchCount = document.getElementById("searchCount");

  // Delete Modal
  els.deleteModal = document.getElementById("deleteModal");
  els.cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  els.confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
}

function populateGraduationYears() {
  els.yearInput.innerHTML = '<option value="">Select year</option>' +
    GRADUATION_YEARS.map(y => `<option value="${y}">${y}</option>`).join('');
  els.searchYear.innerHTML = '<option value="">All years</option>' +
    GRADUATION_YEARS.map(y => `<option value="${y}">${y}</option>`).join('');
}

function bindEvents() {
  const accountMenuBtn = document.getElementById('accountMenuBtn');
  const accountDropdown = document.getElementById('accountDropdown');
  const signOutBtn = document.getElementById('signOutBtn');

  if (accountMenuBtn && accountDropdown) {
    accountMenuBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = !accountDropdown.classList.contains('hidden');
      accountDropdown.classList.toggle('hidden', isOpen);
      accountMenuBtn.setAttribute('aria-expanded', String(!isOpen));
    });

    accountDropdown.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    document.addEventListener('click', () => {
      accountDropdown.classList.add('hidden');
      accountMenuBtn.setAttribute('aria-expanded', 'false');
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      window.location.href = 'login.html';
    });
  }

  // Navigation
  els.navItems.forEach((item) => {
    item.addEventListener("click", () => navigate(item.dataset.page));
  });

  // Global search
  els.globalSearch.addEventListener("input", handleGlobalSearch);

  // Records page filters
  els.recordFilter.addEventListener("input", applyRecordFilters);
  els.courseFilter.addEventListener("change", applyRecordFilters);
  els.yearFilter.addEventListener("change", applyRecordFilters);
  els.exportBtn.addEventListener("click", exportCsv);

  // Add form
  els.addForm.addEventListener("submit", submitAddForm);
  els.clearFormBtn.addEventListener("click", clearAddForm);
  els.courseInput.addEventListener("change", updateDepartmentDropdown);

  // Search
  els.searchBtn.addEventListener("click", runSearch);
  els.searchCourse.addEventListener("change", updateSearchDepartmentDropdown);

  // Delete modal
  els.cancelDeleteBtn.addEventListener("click", closeDeleteModal);
  els.confirmDeleteBtn.addEventListener("click", confirmDelete);
}

// ===== NAVIGATION =====

function navigate(pageName) {
  currentPage = pageName;
  els.pages.forEach(p => p.classList.add("hidden"));
  els.navItems.forEach(n => n.classList.remove("active"));
  
  const page = document.getElementById(`page-${pageName}`);
  if (page) page.classList.remove("hidden");
  
  const navItem = document.querySelector(`.nav-item[data-page="${pageName}"]`);
  if (navItem) navItem.classList.add("active");
  
  els.topbarTitle.textContent = pageTitles[pageName];

  if (pageName === "dashboard") loadDashboard();
  if (pageName === "records") loadRecords();
  if (pageName === "search") clearSearchForm();
}

// ===== API FUNCTIONS =====

async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentSession?.access_token || ''}`,
        ...(options.headers || {})
      },
      ...options
    });

    const text = await res.text();
    if (res.status === 401) {
      await supabaseClient.auth.signOut();
      window.location.href = 'login.html';
      return;
    }
    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      showToast(data?.error || `Error ${res.status}`, "error");
      throw new Error(data?.error || `HTTP ${res.status}`);
    }

    return data;
  } catch (e) {
    showToast(e.message, "error");
    throw e;
  }
}

async function fetchAlumni() {
  return await apiFetch('/api/alumni');
}

// ===== DASHBOARD =====

async function loadDashboard() {
  try {
    const [alumni, stats] = await Promise.all([
      fetchAlumni(),
      apiFetch('/api/analytics/stats')
    ]);
    
    allAlumni = alumni;
    dashboardStats = stats;
    
    renderDashboardStats(stats);
    await loadDashboardCharts();
    renderRecentRecords(alumni.slice(0, 5));
  } catch (e) {
    console.error('Dashboard load failed:', e);
  }
}

function renderDashboardStats(stats) {
  els.statTotal.textContent = stats.totalAlumni;
  els.statCourses.textContent = stats.totalCourses;
  els.statDepartments.textContent = stats.totalDepartments;
  els.statLatestYear.textContent = stats.latestGraduationYear;
}

async function loadDashboardCharts() {
  try {
    const [byDept, byCourse, byYear] = await Promise.all([
      apiFetch('/api/analytics/alumni-by-department'),
      apiFetch('/api/analytics/alumni-by-course'),
      apiFetch('/api/analytics/alumni-by-year')
    ]);

    renderDepartmentChart(byDept);
    renderCourseChart(byCourse);
    renderYearChart(byYear);
  } catch (e) {
    console.error('Chart loading failed:', e);
  }
}

function hasMeaningfulChartData(data) {
  return Array.isArray(data) && data.some(item => Number(item.count) > 0);
}

function showChartEmptyState(chartEl, legendEl, message = "No alumni records yet") {
  const shell = chartEl?.closest(".chart-shell");
  if (shell) {
    shell.classList.add("is-empty");
    let empty = shell.querySelector(".chart-empty");
    if (!empty) {
      empty = document.createElement("div");
      empty.className = "chart-empty";
      shell.appendChild(empty);
    }
    empty.textContent = message;
  }
  if (legendEl) legendEl.innerHTML = "";
}

function renderDepartmentChart(data) {
  if (!hasMeaningfulChartData(data)) {
    destroyChart("department");
    showChartEmptyState(els.deptChart, els.deptLegend);
    return;
  }

  renderDoughnutChart("department", els.deptChart, els.deptLegend, data, "department", "Alumni by Department");
}

function renderCourseChart(data) {
  if (!hasMeaningfulChartData(data)) {
    destroyChart("course");
    showChartEmptyState(els.courseChart);
    return;
  }
  renderBarChart("course", els.courseChart, data, "course", "Alumni by Course");
}

function renderYearChart(data) {
  if (!hasMeaningfulChartData(data)) {
    destroyChart("year");
    showChartEmptyState(els.yearChart);
    return;
  }
  renderBarChart("year", els.yearChart, data, "year", "Graduation Year Distribution");
}

function renderBarChart(chartKey, canvas, data, labelKey, label) {
  if (!ensureChartJsLoaded() || !ensureCanvas(canvas)) return;

  destroyChart(chartKey);

  chartInstances[chartKey] = new Chart(canvas, {
    type: "bar",
    data: {
      labels: data.map(item => String(item[labelKey] ?? "Unspecified")),
      datasets: [{
        label,
        data: data.map(item => Number(item.count) || 0),
        backgroundColor: getCssVar("--chart-1"),
        borderColor: getCssVar("--accent-hover"),
        borderWidth: 1,
        borderRadius: 6,
        maxBarThickness: 56
      }]
    },
    options: chartOptions(label)
  });
}

function renderDoughnutChart(chartKey, canvas, legend, data, labelKey, label) {
  if (!ensureChartJsLoaded() || !ensureCanvas(canvas)) return;

  destroyChart(chartKey);

  const colors = data.map((_, index) => getCssVar(chartColors[index % chartColors.length]));
  chartInstances[chartKey] = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: data.map(item => String(item[labelKey] ?? "Unspecified")),
      datasets: [{
        label,
        data: data.map(item => Number(item.count) || 0),
        backgroundColor: colors,
        borderColor: "#FFFFFF",
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      ...chartOptions(label),
      cutout: "62%",
      scales: {}
    }
  });

  if (legend) {
    legend.innerHTML = data.map((item, index) => `
      <div class="legend-item">
        <span class="legend-swatch" style="background:${colors[index]}"></span>
        <span class="legend-name">${escapeHtml(item[labelKey])}</span>
        <span class="legend-count">${item.count}</span>
      </div>
    `).join("");
  }
}

function ensureChartJsLoaded() {
  if (window.Chart) return true;

  console.error("Chart.js is not loaded. Check the CDN script in index.html.");
  if (!chartLoadWarningShown) {
    showToast("Chart.js failed to load", "error");
    chartLoadWarningShown = true;
  }

  [els.deptChart, els.courseChart, els.yearChart].forEach(canvas => {
    if (canvas) showChartEmptyState(canvas, null, "Chart library failed to load");
  });
  return false;
}

function ensureCanvas(canvas) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    console.error("Chart target is not a canvas element:", canvas);
    return false;
  }

  const shell = canvas.closest(".chart-shell");
  if (shell) {
    shell.classList.remove("is-empty");
    shell.querySelector(".chart-empty")?.remove();
  }

  canvas.height = 300;
  canvas.style.width = "100%";
  canvas.style.minHeight = "300px";
  return true;
}

function destroyChart(chartKey) {
  if (chartInstances[chartKey]) {
    chartInstances[chartKey].destroy();
    chartInstances[chartKey] = null;
  }
}

function chartOptions(label) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label(context) {
            const value = context.parsed?.y ?? context.parsed;
            return `${context.label}: ${value} alumni`;
          }
        }
      },
      title: {
        display: false,
        text: label
      }
    },
    scales: {
      x: {
        ticks: {
          color: getCssVar("--text-muted"),
          maxRotation: 45,
          minRotation: 0
        },
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: getCssVar("--text-muted")
        },
        grid: {
          color: getCssVar("--border")
        }
      }
    }
  };
}

function renderRecentRecords(records) {
  if (!records.length) {
    els.recentRecords.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">No records yet</p>`;
    return;
  }

  els.recentRecords.innerHTML = `
    <div class="records-preview">
      ${records.map(r => `
        <div class="preview-item">
          <div class="preview-name">${escapeHtml(r.name)}</div>
          <div class="preview-meta">${escapeHtml(r.course || '-')} • ${r.graduation_year || '-'}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ===== RECORDS PAGE =====

async function loadRecords() {
  try {
    const data = await fetchAlumni();
    allAlumni = data;
    filteredRecords = [...data];
    populateRecordFilters(data);
    applyRecordFilters();
  } catch (e) {
    console.error('Records load failed:', e);
  }
}

function populateRecordFilters(data) {
  const courses = [...new Set(data.map(item => item.course).filter(Boolean))].sort();
  const years = [...new Set(data.map(item => item.graduation_year).filter(Boolean))].sort((a, b) => Number(b) - Number(a));

  els.courseFilter.innerHTML = `<option value="">All courses</option>${courses.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join('')}`;
  els.yearFilter.innerHTML = `<option value="">All years</option>${years.map(y => `<option value="${escapeAttr(y)}">${escapeHtml(y)}</option>`).join('')}`;
}

function applyRecordFilters() {
  const query = els.recordFilter.value.trim().toLowerCase();
  const course = els.courseFilter.value;
  const year = els.yearFilter.value;

  filteredRecords = allAlumni.filter(item => {
    const matchesSearch = !query || 
      item.name.toLowerCase().includes(query) ||
      (item.usn && item.usn.toLowerCase().includes(query)) ||
      (item.email && item.email.toLowerCase().includes(query));
    const matchesCourse = !course || item.course === course;
    const matchesYear = !year || String(item.graduation_year) === year;

    return matchesSearch && matchesCourse && matchesYear;
  });

  renderRecordsTable(filteredRecords);
}

function renderRecordsTable(data) {
  if (!data.length) {
    els.recordsBody.innerHTML = `<tr><td colspan="9" class="empty-cell">${emptyState("No records found")}</td></tr>`;
    return;
  }

  els.recordsBody.innerHTML = data.map((item) => recordRowHtml(item)).join("");
}

function recordRowHtml(item) {
  return `
    <tr data-id="${item.id}">
      <td>${escapeHtml(item.usn || '-')}</td>
      <td>${escapeHtml(item.name)}</td>
      <td><span class="badge">${escapeHtml(item.course || '-')}</span></td>
      <td>${escapeHtml(item.department || '-')}</td>
      <td><span class="badge year-badge">${escapeHtml(item.graduation_year || '-')}</span></td>
      <td>${escapeHtml(cleanValue(item.email, "-"))}</td>
      <td>${escapeHtml(cleanValue(item.phone, "-"))}</td>
      <td>${escapeHtml(item.city || '-')}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-secondary btn-small" type="button" onclick="startInlineEdit(${item.id})">Edit</button>
          <button class="btn btn-danger btn-small" type="button" onclick="openDeleteModal(${item.id})">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

function startInlineEdit(id) {
  const item = allAlumni.find(r => r.id === id);
  if (!item) return;
  
  navigate("add");
  els.usnInput.value = item.usn || '';
  els.nameInput.value = item.name;
  els.emailInput.value = item.email || '';
  els.phoneInput.value = item.phone || '';
  els.courseInput.value = item.course || '';
  updateDepartmentDropdown();
  els.departmentInput.value = item.department || '';
  els.yearInput.value = item.graduation_year || '';
  els.cityInput.value = item.city || '';
  
  els.addForm.dataset.editId = id;
}

function exportCsv() {
  const headers = ['USN', 'Name', 'Email', 'Phone', 'Course', 'Department', 'Year', 'City'];
  const rows = filteredRecords.map(item => [
    item.usn || '',
    item.name,
    item.email || '',
    item.phone || '',
    item.course || '',
    item.department || '',
    item.graduation_year || '',
    item.city || ''
  ]);

  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'alumni.csv';
  a.click();
  window.URL.revokeObjectURL(url);
}

// ===== ADD FORM =====

function updateDepartmentDropdown() {
  const course = els.courseInput.value;
  const departments = DEPARTMENT_MAP[course] || [];
  els.departmentInput.innerHTML = `
    <option value="">Select department</option>
    ${departments.map(d => `<option value="${escapeAttr(d)}">${escapeHtml(d)}</option>`).join('')}
  `;
}

function clearAddForm() {
  els.addForm.reset();
  delete els.addForm.dataset.editId;
  els.departmentInput.innerHTML = '<option value="">Select department first</option>';
  clearValidation();
}

async function submitAddForm(event) {
  event.preventDefault();
  clearValidation();

  const payload = {
    usn: els.usnInput.value.trim(),
    name: els.nameInput.value.trim(),
    email: els.emailInput.value.trim(),
    phone: els.phoneInput.value.trim(),
    course: els.courseInput.value.trim(),
    department: els.departmentInput.value.trim(),
    graduation_year: parseInt(els.yearInput.value) || null,
    city: els.cityInput.value.trim()
  };

  const errors = validateForm(payload);
  if (errors.length) {
    errors.forEach(err => showFieldError(err.field, err.message));
    return;
  }

  try {
    const editId = els.addForm.dataset.editId;
    if (editId) {
      await apiFetch(`/api/alumni/${editId}`, { method: "PUT", body: JSON.stringify(payload) });
      showToast("Alumni record updated");
      delete els.addForm.dataset.editId;
    } else {
      await apiFetch('/api/alumni', { method: "POST", body: JSON.stringify(payload) });
      showToast("Alumni record added");
    }
    clearAddForm();
    if (currentPage === 'records') loadRecords();
    else if (currentPage === 'dashboard') loadDashboard();
  } catch (e) {
    // Error already shown by apiFetch
  }
}

function validateForm(payload) {
  const errors = [];
  if (!payload.name) errors.push({ field: 'name', message: 'Name is required' });
  if (!payload.course) errors.push({ field: 'course', message: 'Course is required' });
  if (!payload.department) errors.push({ field: 'department', message: 'Department is required' });
  if (!payload.graduation_year) errors.push({ field: 'graduation_year', message: 'Graduation Year is required' });
  return errors;
}

// ===== SEARCH =====

function updateSearchDepartmentDropdown() {
  const course = els.searchCourse.value;
  const departments = DEPARTMENT_MAP[course] || [];
  els.searchDepartment.innerHTML = `
    <option value="">All departments</option>
    ${departments.map(d => `<option value="${escapeAttr(d)}">${escapeHtml(d)}</option>`).join('')}
  `;
}

async function runSearch() {
  const params = new URLSearchParams({
    name: els.searchName.value.trim(),
    usn: els.searchUSN.value.trim(),
    course: els.searchCourse.value,
    department: els.searchDepartment.value,
    year: els.searchYear.value
  });

  try {
    const results = await apiFetch(`/api/search?${params}`);
    filteredRecords = results;
    renderRecordsTable(results);
    els.searchCount.textContent = `${results.length} record${results.length !== 1 ? 's' : ''} found`;
  } catch (e) {
    console.error('Search failed:', e);
  }
}

function clearSearchForm() {
  els.searchName.value = '';
  els.searchUSN.value = '';
  els.searchCourse.value = '';
  els.searchDepartment.value = '';
  els.searchYear.value = '';
  els.searchBody.innerHTML = '';
  els.searchCount.textContent = '0 records found';
}

// ===== DELETE MODAL =====

function openDeleteModal(id) {
  pendingDeleteId = id;
  els.deleteModal.classList.remove("hidden");
}

function closeDeleteModal() {
  pendingDeleteId = null;
  els.deleteModal.classList.add("hidden");
}

async function confirmDelete() {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;

  try {
    await apiFetch(`/api/alumni/${id}`, { method: "DELETE" });
    closeDeleteModal();
    showToast("Record deleted");
    if (currentPage === 'records') loadRecords();
    else if (currentPage === 'dashboard') loadDashboard();
  } catch (e) {
    // Error already shown
  }
}

// ===== GLOBAL SEARCH =====

async function handleGlobalSearch(event) {
  const query = event.target.value.trim().toLowerCase();
  if (!query) return;

  try {
    const results = await fetchAlumni();
    const matched = results.filter(item =>
      item.name.toLowerCase().includes(query) ||
      (item.usn && item.usn.toLowerCase().includes(query)) ||
      (item.email && item.email.toLowerCase().includes(query))
    );

    if (matched.length > 0) {
      startInlineEdit(matched[0].id);
    }
  } catch (e) {
    console.error('Global search failed:', e);
  }
}

// ===== UTILITIES =====

function getCssVar(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function cleanValue(val, placeholder = '') {
  return val && val.trim() ? val : placeholder;
}

function emptyState(message) {
  return `<span style="color: var(--text-muted); font-size: 14px;">${message}</span>`;
}

function emptyChartSvg(message) {
  return `
    <svg viewBox="0 0 300 300" height="300" role="img" aria-label="${escapeAttr(message)}">
      <text x="150" y="150" text-anchor="middle" fill="#64748B" font-family="Plus Jakarta Sans" font-size="14" font-weight="500">${escapeHtml(message)}</text>
    </svg>
  `;
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    padding: 12px 16px;
    margin-bottom: 12px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    background: ${type === 'error' ? 'var(--danger)' : 'var(--success)'};
    color: white;
    animation: toastIn 200ms ease;
  `;
  els.toastRoot.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showFieldError(field, message) {
  const errorEl = document.querySelector(`[data-error-for="${field}"]`);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

function clearValidation() {
  document.querySelectorAll('.field-error').forEach(el => {
    el.textContent = '';
    el.style.display = 'none';
  });
}

function bindChartTooltip(element, dataFn) {
  element.addEventListener('mouseenter', (e) => {
    const data = dataFn();
    els.chartTooltip.innerHTML = `
      <div class="tooltip-label">${escapeHtml(data.label)}</div>
      <div class="tooltip-value">${data.value}</div>
      <div class="tooltip-sub">${escapeHtml(data.sub)}</div>
    `;
    els.chartTooltip.style.display = 'block';
    updateTooltipPosition(e);
  });

  element.addEventListener('mousemove', updateTooltipPosition);
  element.addEventListener('mouseleave', () => {
    els.chartTooltip.style.display = 'none';
  });
}

function updateTooltipPosition(e) {
  if (els.chartTooltip.style.display !== 'block') return;
  const rect = e.target.getBoundingClientRect();
  els.chartTooltip.style.left = (e.clientX + 10) + 'px';
  els.chartTooltip.style.top = (e.clientY + 10) + 'px';
}

// Make functions globally available for inline onclick handlers
window.openDeleteModal = openDeleteModal;
window.startInlineEdit = startInlineEdit;
