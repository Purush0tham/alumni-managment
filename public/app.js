let allAlumni = [];
let filteredRecords = [];
let activityLog = [];
let todayCount = 0;
let activeSearchTab = "name";
let pendingDeleteId = null;
let currentPage = "dashboard";

const chartColors = [
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--chart-6"
];

const pageTitles = {
  dashboard: "Dashboard",
  records: "All Records",
  add: "Add Alumni",
  search: "Search"
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindEvents();
  navigate("dashboard");
});

function cacheElements() {
  els.pages = document.querySelectorAll(".page");
  els.navItems = document.querySelectorAll(".nav-item");
  els.topbarTitle = document.getElementById("topbarTitle");
  els.globalSearch = document.getElementById("globalSearch");
  els.connectionDot = document.getElementById("connectionDot");
  els.toastRoot = document.getElementById("toastRoot");
  els.chartTooltip = document.getElementById("chartTooltip");

  els.statTotal = document.getElementById("statTotal");
  els.statCourses = document.getElementById("statCourses");
  els.statLatestYear = document.getElementById("statLatestYear");
  els.statTopCourse = document.getElementById("statTopCourse");
  els.donutChart = document.getElementById("donutChart");
  els.courseLegend = document.getElementById("courseLegend");
  els.barChart = document.getElementById("barChart");
  els.courseProgress = document.getElementById("courseProgress");
  els.activityFeed = document.getElementById("activityFeed");

  els.recordFilter = document.getElementById("recordFilter");
  els.courseFilter = document.getElementById("courseFilter");
  els.yearFilter = document.getElementById("yearFilter");
  els.exportBtn = document.getElementById("exportBtn");
  els.recordsBody = document.getElementById("recordsBody");

  els.addForm = document.getElementById("addForm");
  els.addBanner = document.getElementById("addBanner");
  els.clearFormBtn = document.getElementById("clearFormBtn");
  els.courseInput = document.getElementById("courseInput");

  els.searchTabs = document.querySelectorAll(".tab");
  els.searchBtn = document.getElementById("searchBtn");
  els.searchName = document.getElementById("searchName");
  els.searchCourse = document.getElementById("searchCourse");
  els.searchYear = document.getElementById("searchYear");
  els.searchBody = document.getElementById("searchBody");
  els.searchCount = document.getElementById("searchCount");

  els.deleteModal = document.getElementById("deleteModal");
  els.cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  els.confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
}

function bindEvents() {
  els.navItems.forEach((item) => {
    item.addEventListener("click", () => navigate(item.dataset.page));
  });

  els.globalSearch.addEventListener("input", handleGlobalSearch);

  els.recordFilter.addEventListener("input", applyRecordFilters);
  els.courseFilter.addEventListener("change", applyRecordFilters);
  els.yearFilter.addEventListener("change", applyRecordFilters);
  els.exportBtn.addEventListener("click", exportCsv);

  els.addForm.addEventListener("submit", submitAddForm);
  els.clearFormBtn.addEventListener("click", clearAddForm);

  els.searchTabs.forEach((tab) => {
    tab.addEventListener("click", () => setSearchTab(tab.dataset.searchTab));
  });
  els.searchBtn.addEventListener("click", runSearch);

  els.cancelDeleteBtn.addEventListener("click", closeDeleteModal);
  els.confirmDeleteBtn.addEventListener("click", confirmDelete);
}

function navigate(pageName) {
  currentPage = pageName;
  els.pages.forEach((page) => page.classList.add("hidden"));
  document.getElementById(`page-${pageName}`).classList.remove("hidden");

  els.navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.page === pageName);
  });

  els.topbarTitle.textContent = pageTitles[pageName];

  if (pageName === "dashboard") loadDashboard();
  if (pageName === "records") loadRecords();
  if (pageName === "search") loadSearch();
}

async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      const message = data && data.error ? data.error : `Request failed with status ${res.status}`;
      throw new Error(message);
    }

    setConnectionStatus(true);
    return data;
  } catch (error) {
    setConnectionStatus(false);
    showToast(error.message || "Network error", "error");
    throw error;
  }
}

function setConnectionStatus(isConnected) {
  els.connectionDot.classList.remove("is-pending", "is-connected", "is-error");
  els.connectionDot.classList.add(isConnected ? "is-connected" : "is-error");
}

async function fetchAlumni() {
  try {
    allAlumni = await apiFetch("/api/alumni");
  } catch {
    allAlumni = [];
  }
  return allAlumni;
}

async function loadDashboard() {
  const data = await fetchAlumni();
  renderDashboard(data);
}

async function loadRecords() {
  const data = await fetchAlumni();
  filteredRecords = [...data];
  populateRecordFilters(data);
  applyRecordFilters();
}

function loadSearch() {
  els.searchCount.textContent = "0 records found";
}

function renderDashboard(data) {
  const courses = groupByCourse(data);
  const years = groupByYear(data);
  const latestYear = data
    .map((item) => Number(item.graduation_year))
    .filter(Boolean)
    .sort((a, b) => b - a)[0];
  const topCourse = courses[0] ? courses[0].course : "-";

  els.statTotal.textContent = data.length;
  els.statCourses.textContent = courses.length;
  els.statLatestYear.textContent = latestYear || "-";
  els.statTopCourse.textContent = topCourse;

  renderDonutChart(courses, data.length);
  renderBarChart(years);
  renderProgressList(courses);
  renderActivityFeed();
}

function groupByCourse(data) {
  const counts = new Map();
  data.forEach((item) => {
    const course = cleanValue(item.course, "Unassigned");
    counts.set(course, (counts.get(course) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([course, count]) => ({ course, count }))
    .sort((a, b) => b.count - a.count || a.course.localeCompare(b.course));
}

function groupByYear(data) {
  const counts = new Map();
  data.forEach((item) => {
    if (!item.graduation_year) return;
    const year = String(item.graduation_year);
    counts.set(year, (counts.get(year) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => Number(a.year) - Number(b.year));
}

function renderDonutChart(data, total) {
  const circumference = 2 * Math.PI * 100;

  if (!data.length) {
    els.donutChart.innerHTML = emptyChartSvg("No course data");
    els.courseLegend.innerHTML = "";
    return;
  }

  let offset = 0;
  const segments = data.map((item, index) => {
    const arc = (item.count / total) * circumference;
    const color = getCssVar(chartColors[index % chartColors.length]);
    const dashOffset = -offset;
    offset += arc;
    return `
      <circle
        class="donut-segment"
        cx="150"
        cy="150"
        r="100"
        fill="none"
        stroke="${color}"
        stroke-width="48"
        stroke-dasharray="0 ${circumference}"
        stroke-dashoffset="${dashOffset}"
        stroke-linecap="round"
        data-final-dash="${arc} ${circumference}"
        data-label="${escapeAttr(item.course)}"
        data-count="${item.count}"
        data-percent="${((item.count / total) * 100).toFixed(1)}"
        style="transition-delay:${index * 0.1}s"
      ></circle>`;
  }).join("");

  els.donutChart.innerHTML = `
    <svg viewBox="0 0 300 300" height="300" role="img" aria-label="Alumni by course donut chart">
      <defs>
        <filter id="centerShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.08"/>
        </filter>
      </defs>
      <g transform="rotate(-90 150 150)">${segments}</g>
      <circle cx="150" cy="150" r="76" fill="#FFFFFF" filter="url(#centerShadow)"></circle>
      <text x="150" y="150" text-anchor="middle" dominant-baseline="middle" fill="#0F172A" font-family="Plus Jakarta Sans" font-size="32" font-weight="700">${total}</text>
      <text x="150" y="170" text-anchor="middle" fill="#64748B" font-family="Plus Jakarta Sans" font-size="12" font-weight="500">alumni</text>
    </svg>`;

  els.courseLegend.innerHTML = data.map((item, index) => `
    <div class="legend-item">
      <span class="legend-swatch" style="background:${getCssVar(chartColors[index % chartColors.length])}"></span>
      <span class="legend-name">${escapeHtml(item.course)}</span>
      <span class="legend-count">${item.count}</span>
    </div>
  `).join("");

  requestAnimationFrame(() => {
    els.donutChart.querySelectorAll(".donut-segment").forEach((segment) => {
      segment.setAttribute("stroke-dasharray", segment.dataset.finalDash);
      bindChartTooltip(segment, () => ({
        label: segment.dataset.label,
        value: segment.dataset.count,
        sub: `${segment.dataset.percent}% of alumni`
      }));
      segment.addEventListener("mouseenter", () => segment.setAttribute("stroke-width", "54"));
      segment.addEventListener("mouseleave", () => segment.setAttribute("stroke-width", "48"));
    });
  });
}

function renderBarChart(data) {
  if (!data.length) {
    els.barChart.innerHTML = emptyChartSvg("No year data");
    return;
  }

  const width = 500;
  const height = 280;
  const left = 50;
  const right = 20;
  const top = 20;
  const bottom = 40;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxCount = Math.max(...data.map((item) => item.count));
  const maxY = Math.max(5, Math.ceil(maxCount / 5) * 5);
  const slot = chartWidth / data.length;
  const barWidth = Math.min(32, Math.max(12, slot * 0.55));

  const grid = Array.from({ length: 6 }, (_, index) => {
    const value = (maxY / 5) * index;
    const y = top + chartHeight - (value / maxY) * chartHeight;
    return `
      <line class="grid-line" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"></line>
      <text class="axis-label" x="${left - 8}" y="${y + 4}" text-anchor="end">${Math.round(value)}</text>
    `;
  }).join("");

  const bars = data.map((item, index) => {
    const barHeight = (item.count / maxY) * chartHeight;
    const x = left + slot * index + (slot - barWidth) / 2;
    const y = top + chartHeight - barHeight;
    const labelX = left + slot * index + slot / 2;
    return `
      <rect
        class="bar-rect"
        x="${x}"
        y="${y}"
        width="${barWidth}"
        height="${barHeight}"
        fill="${getCssVar("--chart-1")}"
        data-label="${escapeAttr(item.year)}"
        data-count="${item.count}"
        style="transition-delay:${index * 0.08}s"
      ></rect>
      <text class="axis-label" x="${labelX}" y="${height - 14}" text-anchor="middle">${escapeHtml(item.year)}</text>
    `;
  }).join("");

  els.barChart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Alumni by graduation year bar chart">
      ${grid}
      ${bars}
    </svg>`;

  requestAnimationFrame(() => {
    els.barChart.querySelectorAll(".bar-rect").forEach((bar) => {
      bar.classList.add("is-visible");
      bindChartTooltip(bar, () => ({
        label: bar.dataset.label,
        value: bar.dataset.count,
        sub: "graduates"
      }));
      bar.addEventListener("mouseenter", () => bar.setAttribute("fill", "#1D4ED8"));
      bar.addEventListener("mouseleave", () => bar.setAttribute("fill", getCssVar("--chart-1")));
    });
  });
}

function renderProgressList(data) {
  if (!data.length) {
    els.courseProgress.innerHTML = emptyState("No records found");
    return;
  }

  const maxCount = Math.max(...data.map((item) => item.count));
  els.courseProgress.innerHTML = data.map((item, index) => {
    const width = (item.count / maxCount) * 100;
    return `
      <div class="progress-row">
        <div class="progress-meta">
          <span class="progress-name">${escapeHtml(item.course)}</span>
          <span class="progress-count">${item.count}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" data-width="${width}" style="transition-delay:${index * 0.08}s"></div>
        </div>
      </div>
    `;
  }).join("");

  requestAnimationFrame(() => {
    els.courseProgress.querySelectorAll(".progress-fill").forEach((fill) => {
      fill.style.width = `${fill.dataset.width}%`;
    });
  });
}

function renderActivityFeed() {
  if (!activityLog.length) {
    els.activityFeed.innerHTML = `<div class="empty-cell">No recent activity</div>`;
    return;
  }

  els.activityFeed.innerHTML = activityLog.map((item) => `
    <div class="activity-item">
      <span class="activity-dot ${item.type}"></span>
      <span class="activity-text">${escapeHtml(item.text)}</span>
      <span class="activity-time">${escapeHtml(item.time)}</span>
    </div>
  `).join("");
}

function addActivity(text, type) {
  activityLog.unshift({
    text,
    type,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });
  activityLog = activityLog.slice(0, 8);
  renderActivityFeed();
}

function populateRecordFilters(data) {
  const currentCourse = els.courseFilter.value;
  const currentYear = els.yearFilter.value;
  const courses = [...new Set(data.map((item) => item.course).filter(Boolean))].sort();
  const years = [...new Set(data.map((item) => item.graduation_year).filter(Boolean))]
    .sort((a, b) => Number(b) - Number(a));

  els.courseFilter.innerHTML = `<option value="">All courses</option>${courses.map((course) => (
    `<option value="${escapeAttr(course)}">${escapeHtml(course)}</option>`
  )).join("")}`;
  els.yearFilter.innerHTML = `<option value="">All years</option>${years.map((year) => (
    `<option value="${escapeAttr(year)}">${escapeHtml(year)}</option>`
  )).join("")}`;

  els.courseFilter.value = courses.includes(currentCourse) ? currentCourse : "";
  els.yearFilter.value = years.map(String).includes(currentYear) ? currentYear : "";
}

function applyRecordFilters() {
  const query = els.recordFilter.value.trim().toLowerCase();
  const course = els.courseFilter.value;
  const year = els.yearFilter.value;

  filteredRecords = allAlumni.filter((item) => {
    const text = [
      item.id,
      item.name,
      item.email,
      item.phone,
      item.course,
      item.graduation_year
    ].map((value) => cleanValue(value, "")).join(" ").toLowerCase();

    return (!query || text.includes(query))
      && (!course || item.course === course)
      && (!year || String(item.graduation_year) === year);
  });

  renderRecordsTable(filteredRecords);
}

function renderRecordsTable(data) {
  if (!data.length) {
    els.recordsBody.innerHTML = `<tr><td colspan="7" class="empty-cell">${emptyState("No records found")}</td></tr>`;
    return;
  }

  els.recordsBody.innerHTML = data.map((item) => recordRowHtml(item)).join("");
}

function recordRowHtml(item) {
  return `
    <tr data-id="${item.id}">
      <td class="mono">${item.id}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(cleanValue(item.email, "-"))}</td>
      <td>${escapeHtml(cleanValue(item.phone, "-"))}</td>
      <td><span class="badge">${escapeHtml(cleanValue(item.course, "-"))}</span></td>
      <td><span class="badge year-badge">${escapeHtml(cleanValue(item.graduation_year, "-"))}</span></td>
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
  const item = allAlumni.find((record) => record.id === id);
  const row = els.recordsBody.querySelector(`tr[data-id="${id}"]`);
  if (!item || !row) return;

  row.innerHTML = `
    <td class="mono">${item.id}</td>
    <td><input class="input edit-row-input" data-edit="name" value="${escapeAttr(item.name)}"></td>
    <td><input class="input edit-row-input" data-edit="email" value="${escapeAttr(cleanValue(item.email, ""))}"></td>
    <td><input class="input edit-row-input" data-edit="phone" value="${escapeAttr(cleanValue(item.phone, ""))}"></td>
    <td><input class="input edit-row-input" data-edit="course" value="${escapeAttr(cleanValue(item.course, ""))}"></td>
    <td><input class="input edit-row-input" data-edit="graduation_year" type="number" value="${escapeAttr(cleanValue(item.graduation_year, ""))}"></td>
    <td>
      <div class="row-actions">
        <button class="btn btn-primary btn-small" type="button" onclick="saveInlineEdit(${id})">Save</button>
        <button class="btn btn-secondary btn-small" type="button" onclick="cancelInlineEdit()">Cancel</button>
      </div>
    </td>
  `;
}

async function saveInlineEdit(id) {
  const row = els.recordsBody.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const payload = {
    name: row.querySelector('[data-edit="name"]').value.trim(),
    email: row.querySelector('[data-edit="email"]').value.trim(),
    phone: row.querySelector('[data-edit="phone"]').value.trim(),
    course: row.querySelector('[data-edit="course"]').value.trim(),
    graduation_year: normalizeYear(row.querySelector('[data-edit="graduation_year"]').value)
  };

  if (!payload.name) {
    showToast("Name is required", "error");
    return;
  }

  try {
    await apiFetch(`/api/alumni/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    addActivity(`Edited ${payload.name}`, "edit");
    showToast("Alumni updated successfully");
    await loadRecords();
    if (currentPage === "dashboard") renderDashboard(allAlumni);
  } catch {
    // apiFetch already shows the error toast.
  }
}

function cancelInlineEdit() {
  renderRecordsTable(filteredRecords);
}

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
  const item = allAlumni.find((record) => record.id === id);

  try {
    await apiFetch(`/api/alumni/${id}`, { method: "DELETE" });
    closeDeleteModal();
    addActivity(`Deleted ${item ? item.name : `record #${id}`}`, "delete");
    showToast("Record deleted");
    await loadRecords();
  } catch {
    // apiFetch already shows the error toast.
  }
}

async function submitAddForm(event) {
  event.preventDefault();
  clearValidation();

  const payload = {
    name: document.getElementById("nameInput").value.trim(),
    email: document.getElementById("emailInput").value.trim(),
    phone: document.getElementById("phoneInput").value.trim(),
    course: document.getElementById("courseInput").value.trim(),
    graduation_year: normalizeYear(document.getElementById("yearInput").value)
  };

  const errors = {};
  if (!payload.name) errors.name = "This field is required";
  if (!payload.course) errors.course = "This field is required";
  if (!payload.graduation_year) errors.graduation_year = "This field is required";

  if (Object.keys(errors).length) {
    showValidation(errors);
    return;
  }

  try {
    await apiFetch("/api/alumni", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    todayCount += 1;
    addActivity(`Added ${payload.name}`, "add");
    showBanner("Alumni added successfully", "success");
    showToast("Alumni added successfully");
    clearAddForm();
    await fetchAlumni();
  } catch (error) {
    showBanner(`Error: ${error.message}`, "error");
  }
}

function clearAddForm() {
  els.addForm.reset();
  clearValidation();
}

function clearValidation() {
  els.addForm.querySelectorAll(".input").forEach((input) => input.classList.remove("is-error"));
  els.addForm.querySelectorAll(".field-error").forEach((error) => {
    error.textContent = "";
  });
}

function showValidation(errors) {
  Object.entries(errors).forEach(([name, message]) => {
    const input = els.addForm.querySelector(`[name="${name}"]`);
    const error = els.addForm.querySelector(`[data-error-for="${name}"]`);
    if (input) input.classList.add("is-error");
    if (error) error.textContent = message;
  });
}

function showBanner(message, type) {
  els.addBanner.textContent = message;
  els.addBanner.classList.toggle("is-error", type === "error");
  els.addBanner.classList.remove("hidden");
  window.clearTimeout(showBanner.timer);
  showBanner.timer = window.setTimeout(() => {
    els.addBanner.classList.add("hidden");
  }, 3000);
}

function setSearchTab(tabName) {
  activeSearchTab = tabName;
  els.searchTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.searchTab === tabName);
  });

  document.getElementById("searchPaneName").classList.toggle("hidden", tabName !== "name");
  document.getElementById("searchPaneCourse").classList.toggle("hidden", tabName !== "course");
  document.getElementById("searchPaneYear").classList.toggle("hidden", tabName !== "year");
}

async function runSearch() {
  const params = new URLSearchParams();
  if (activeSearchTab === "name") params.set("name", els.searchName.value.trim());
  if (activeSearchTab === "course") params.set("course", els.searchCourse.value.trim());
  if (activeSearchTab === "year") params.set("year", els.searchYear.value.trim());

  try {
    const results = await apiFetch(`/api/alumni/search/query?${params.toString()}`);
    renderSearchResults(Array.isArray(results) ? results : []);
  } catch {
    const localResults = searchLocalFallback(params);
    renderSearchResults(localResults);
  }
}

function searchLocalFallback(params) {
  const name = (params.get("name") || "").toLowerCase();
  const course = (params.get("course") || "").toLowerCase();
  const year = params.get("year") || "";

  return allAlumni.filter((item) => {
    if (name) return cleanValue(item.name, "").toLowerCase().includes(name);
    if (course) return cleanValue(item.course, "").toLowerCase() === course;
    if (year) return String(item.graduation_year) === year;
    return true;
  });
}

function renderSearchResults(results) {
  els.searchCount.textContent = `${results.length} records found`;

  if (!results.length) {
    els.searchBody.innerHTML = `<tr><td colspan="5" class="empty-cell">${emptyState("No records found")}</td></tr>`;
    return;
  }

  els.searchBody.innerHTML = results.map((item) => `
    <tr>
      <td class="mono">${item.id}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(cleanValue(item.email, "-"))}</td>
      <td><span class="badge">${escapeHtml(cleanValue(item.course, "-"))}</span></td>
      <td><span class="badge year-badge">${escapeHtml(cleanValue(item.graduation_year, "-"))}</span></td>
    </tr>
  `).join("");
}

function handleGlobalSearch() {
  const query = els.globalSearch.value.trim().toLowerCase();
  if (!query) return;
  navigate("records");
  els.recordFilter.value = query;
  applyRecordFilters();
}

function exportCsv() {
  const rows = filteredRecords.length ? filteredRecords : allAlumni;
  const headers = ["id", "name", "email", "phone", "course", "graduation_year"];
  const csvRows = [
    headers.join(","),
    ...rows.map((item) => headers.map((key) => csvValue(item[key])).join(","))
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "alumni_export.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("CSV export ready");
}

function bindChartTooltip(element, getData) {
  element.addEventListener("mousemove", (event) => {
    const data = getData();
    els.chartTooltip.innerHTML = `
      <div class="tooltip-label">${escapeHtml(data.label)}</div>
      <div class="tooltip-value">${escapeHtml(data.value)}</div>
      ${data.sub ? `<div class="tooltip-sub">${escapeHtml(data.sub)}</div>` : ""}
    `;
    els.chartTooltip.style.left = `${event.clientX + 14}px`;
    els.chartTooltip.style.top = `${event.clientY + 14}px`;
    els.chartTooltip.style.display = "block";
  });

  element.addEventListener("mouseleave", () => {
    els.chartTooltip.style.display = "none";
  });
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "error" : ""}`;
  toast.textContent = message;
  els.toastRoot.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add("is-leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, 2500);
}

function emptyChartSvg(message) {
  return `
    <svg viewBox="0 0 300 300" height="300" role="img" aria-label="${escapeAttr(message)}">
      <text x="150" y="150" text-anchor="middle" fill="#64748B" font-family="Plus Jakarta Sans" font-size="14" font-weight="500">${escapeHtml(message)}</text>
    </svg>
  `;
}

function emptyState(message) {
  return `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7"></circle>
        <path d="M20 20l-3.5-3.5"></path>
      </svg>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function cleanValue(value, fallback) {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function normalizeYear(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function csvValue(value) {
  const text = cleanValue(value, "");
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value) {
  return cleanValue(value, "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}

window.startInlineEdit = startInlineEdit;
window.saveInlineEdit = saveInlineEdit;
window.cancelInlineEdit = cancelInlineEdit;
window.openDeleteModal = openDeleteModal;
