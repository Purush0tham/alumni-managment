/**
 * Alumni Management System - server.js
 * Node.js + Express backend with Supabase PostgreSQL
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const supabase = require('./supabaseClient');

const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.user = user;
  next();
};

const app = express();
const PORT = process.env.PORT || 3000;
const ALUMNI_SELECT = 'id, usn, name, email, phone, course, department, graduation_year, city, created_at, updated_at';
const ANALYTICS_SELECT = 'id, course, department, graduation_year, city, created_at';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', verifyAuth);

function cleanString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function cleanYear(value) {
  const year = Number.parseInt(value, 10);
  return Number.isFinite(year) ? year : null;
}

function alumniPayload(body) {
  return {
    usn: cleanString(body.usn),
    name: cleanString(body.name),
    email: cleanString(body.email),
    phone: cleanString(body.phone),
    course: cleanString(body.course),
    department: cleanString(body.department),
    graduation_year: cleanYear(body.graduation_year),
    city: cleanString(body.city)
  };
}

function handleApiError(res, error, operation = 'Operation') {
  if (error?.code === '23505') {
    console.error(`${operation} failed - Duplicate entry:`, error.message);
    return res.status(409).json({ error: 'This record already exists (duplicate USN or Email)' });
  }

  if (error?.code === 'PGRST116') {
    return res.status(404).json({ error: 'Record not found' });
  }

  console.error(`${operation} failed:`, error?.message || error);
  return res.status(500).json({ error: 'An error occurred. Please try again.' });
}

async function getAllAlumniForAnalytics() {
  const { data, error } = await supabase
    .from('alumni')
    .select(ANALYTICS_SELECT);

  if (error) throw error;
  return data || [];
}

function groupCount(rows, key) {
  const counts = new Map();

  rows.forEach((row) => {
    const raw = row[key];
    const label = raw === null || raw === undefined || String(raw).trim() === ''
      ? 'Unspecified'
      : String(raw).trim();
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function uniqueNonEmptyCount(rows, key) {
  return new Set(
    rows
      .map((row) => row[key])
      .filter((value) => value !== null && value !== undefined && String(value).trim() !== '')
      .map((value) => String(value).trim())
  ).size;
}

function latestGraduationYear(rows) {
  const years = rows
    .map((row) => Number(row.graduation_year))
    .filter((year) => Number.isFinite(year));

  return years.length ? Math.max(...years) : 'N/A';
}

function addedThisYear(rows) {
  const currentYear = new Date().getFullYear();

  return rows.filter((row) => {
    if (!row.created_at) return false;
    return new Date(row.created_at).getFullYear() === currentYear;
  }).length;
}

// GET all alumni
app.get('/api/alumni', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('alumni')
      .select(ALUMNI_SELECT)
      .order('id', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    handleApiError(res, error, 'Get alumni');
  }
});

// GET single alumni
app.get('/api/alumni/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('alumni')
      .select(ALUMNI_SELECT)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    handleApiError(res, error, 'Get alumni by ID');
  }
});

// POST - add alumni
app.post('/api/alumni', async (req, res) => {
  const payload = alumniPayload(req.body);
  if (!payload.name) return res.status(400).json({ error: 'Name is required' });

  try {
    const { data, error } = await supabase
      .from('alumni')
      .insert(payload)
      .select('id')
      .single();

    if (error) throw error;
    res.status(201).json({ id: data.id, message: 'Alumni added successfully' });
  } catch (error) {
    handleApiError(res, error, 'Add alumni');
  }
});

// PUT - update alumni
app.put('/api/alumni/:id', async (req, res) => {
  const payload = alumniPayload(req.body);
  if (!payload.name) return res.status(400).json({ error: 'Name is required' });

  try {
    const { data, error } = await supabase
      .from('alumni')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('id')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Alumni updated successfully' });
  } catch (error) {
    handleApiError(res, error, 'Update alumni');
  }
});

// DELETE - remove alumni
app.delete('/api/alumni/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('alumni')
      .delete()
      .eq('id', req.params.id)
      .select('id')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Alumni record deleted successfully' });
  } catch (error) {
    handleApiError(res, error, 'Delete alumni');
  }
});

// Get dashboard statistics
app.get('/api/analytics/stats', async (req, res) => {
  try {
    const rows = await getAllAlumniForAnalytics();
    const departmentGroups = groupCount(rows.filter((row) => cleanString(row.department)), 'department');
    const courseGroups = groupCount(rows.filter((row) => cleanString(row.course)), 'course');

    res.json({
      totalAlumni: rows.length,
      totalCourses: uniqueNonEmptyCount(rows, 'course'),
      totalDepartments: uniqueNonEmptyCount(rows, 'department'),
      totalCities: uniqueNonEmptyCount(rows, 'city'),
      latestGraduationYear: latestGraduationYear(rows),
      mostPopularDepartment: departmentGroups[0]?.label || 'N/A',
      mostPopularCourse: courseGroups[0]?.label || 'N/A',
      addedThisYear: addedThisYear(rows)
    });
  } catch (error) {
    handleApiError(res, error, 'Get analytics stats');
  }
});

// Alumni by Department
app.get('/api/analytics/alumni-by-department', async (req, res) => {
  try {
    const rows = await getAllAlumniForAnalytics();
    res.json(groupCount(rows, 'department').map((item) => ({
      department: item.label,
      count: item.count
    })));
  } catch (error) {
    handleApiError(res, error, 'Get department analytics');
  }
});

// Alumni by Course
app.get('/api/analytics/alumni-by-course', async (req, res) => {
  try {
    const rows = await getAllAlumniForAnalytics();
    res.json(groupCount(rows, 'course').map((item) => ({
      course: item.label,
      count: item.count
    })));
  } catch (error) {
    handleApiError(res, error, 'Get course analytics');
  }
});

// Alumni by Graduation Year
app.get('/api/analytics/alumni-by-year', async (req, res) => {
  try {
    const rows = await getAllAlumniForAnalytics();
    res.json(groupCount(rows, 'graduation_year')
      .map((item) => ({ year: item.label, count: item.count }))
      .sort((a, b) => {
        if (a.year === 'Unspecified') return 1;
        if (b.year === 'Unspecified') return -1;
        return Number(a.year) - Number(b.year);
      }));
  } catch (error) {
    handleApiError(res, error, 'Get year analytics');
  }
});

// Search
app.get('/api/search', async (req, res) => {
  const { name, usn, course, department, year } = req.query;

  try {
    let request = supabase
      .from('alumni')
      .select(ALUMNI_SELECT)
      .order('id', { ascending: false });

    if (name) request = request.ilike('name', `%${name}%`);
    if (usn) request = request.ilike('usn', `%${usn}%`);
    if (course) request = request.eq('course', course);
    if (department) request = request.eq('department', department);
    if (year) request = request.eq('graduation_year', cleanYear(year));

    const { data, error } = await request;
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    handleApiError(res, error, 'Search alumni');
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\nAlumni Management System`);
    console.log(`   -> http://localhost:${PORT}\n`);
  });
}

module.exports = app;

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\nAlumni Management System`);
  console.log(`   -> http://localhost:${PORT}\n`);
});
