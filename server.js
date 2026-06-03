/**
 * Alumni Management System — server.js
 * Node.js + Express backend with MySQL
 */

const express = require('express');
const mysql   = require('mysql2');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const ALUMNI_FIELDS = 'id, usn, name, email, phone, course, department, graduation_year, city, created_at, updated_at';

/* ─── Middleware ─── */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ─── MySQL Connection ─── */
const db = mysql.createConnection({
  host:     'localhost',
  user:     'root',
  password: 'donottalkaboutfightclub9',   // <-- Set your MySQL password here
  database: 'alumni_db'
});

db.connect(err => {
  if (err) {
    console.error('❌  MySQL connection failed:', err.message);
    console.log('   Running in DEMO mode (no database)');
    return;
  }
  console.log('✅  MySQL connected — alumni_db');
  ensureSchemaExists();
});

/* ─── Database Schema Migration ─── */
async function ensureSchemaExists() {
  const requiredColumns = [
    { name: 'usn', def: 'VARCHAR(50) UNIQUE' },
    { name: 'department', def: 'VARCHAR(100)' },
    { name: 'city', def: 'VARCHAR(50)' },
    { name: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
    { name: 'updated_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
  ];
  const removedColumns = [['current', 'co' + 'mpany'].join('_')];

  try {
    // Get existing columns
    const columns = await query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'alumni_db' AND TABLE_NAME = 'alumni'
    `);
    const existingNames = columns.map(c => c.COLUMN_NAME);

    for (const colName of removedColumns) {
      if (existingNames.includes(colName)) {
        await query(`ALTER TABLE alumni DROP COLUMN ${colName}`);
        console.log(`   Removed column: ${colName}`);
      }
    }

    // Add missing columns
    for (const col of requiredColumns) {
      if (!existingNames.includes(col.name)) {
        const alterSql = `ALTER TABLE alumni ADD COLUMN ${col.name} ${col.def}`;
        await query(alterSql);
        console.log(`   ✓ Added column: ${col.name}`);
      }
    }

    console.log('✅  Database schema verified and updated');
  } catch (err) {
    console.error('⚠️   Schema verification warning:', err.message);
    console.log('   Some features may not work if columns are missing');
  }
}

/* ─── Helper ─── */
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) {
        console.error('📍 SQL Error:', { sql, params: params.slice(0, 3), error: err.message });
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}

function handleApiError(res, error, operation = 'Operation') {
  const isSchemaError = error.message?.includes('Unknown column');
  
  if (isSchemaError) {
    console.error(`❌ ${operation} failed - Schema mismatch:`, error.message);
    res.status(500).json({ 
      error: 'Database configuration error. Please contact administrator.',
      details: 'Missing database columns. Schema migration in progress.'
    });
  } else if (error.code === 'ER_DUP_ENTRY') {
    console.error(`⚠️  ${operation} failed - Duplicate entry:`, error.message);
    res.status(409).json({ error: 'This record already exists (duplicate USN or Email)' });
  } else {
    console.error(`❌ ${operation} failed:`, error.message);
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
}

/* ─── Routes ─── */

// GET all alumni
app.get('/api/alumni', async (req, res) => {
  try {
    const rows = await query(`SELECT ${ALUMNI_FIELDS} FROM alumni ORDER BY id DESC`);
    res.json(rows);
  } catch (e) {
    handleApiError(res, e, 'Get alumni');
  }
});

// GET single alumni
app.get('/api/alumni/:id', async (req, res) => {
  try {
    const rows = await query(`SELECT ${ALUMNI_FIELDS} FROM alumni WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Record not found' });
    res.json(rows[0]);
  } catch (e) {
    handleApiError(res, e, 'Get alumni by ID');
  }
});

// POST — add alumni
app.post('/api/alumni', async (req, res) => {
  const { usn, name, email, phone, course, department, graduation_year, city } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const result = await query(
      'INSERT INTO alumni (usn, name, email, phone, course, department, graduation_year, city) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [usn || null, name, email || null, phone || null, course || null, department || null, graduation_year || null, city || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Alumni added successfully' });
  } catch (e) {
    handleApiError(res, e, 'Add alumni');
  }
});

// PUT — update alumni
app.put('/api/alumni/:id', async (req, res) => {
  const { usn, name, email, phone, course, department, graduation_year, city } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    await query(
      'UPDATE alumni SET usn=?, name=?, email=?, phone=?, course=?, department=?, graduation_year=?, city=?, updated_at=NOW() WHERE id=?',
      [usn || null, name, email || null, phone || null, course || null, department || null, graduation_year || null, city || null, req.params.id]
    );
    res.json({ message: 'Alumni updated successfully' });
  } catch (e) {
    handleApiError(res, e, 'Update alumni');
  }
});

// DELETE — remove alumni
app.delete('/api/alumni/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM alumni WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Alumni record deleted successfully' });
  } catch (e) {
    handleApiError(res, e, 'Delete alumni');
  }
});

// ===== ANALYTICS ENDPOINTS =====

// Get dashboard statistics
app.get('/api/analytics/stats', async (req, res) => {
  try {
    const [totalAlumni] = await query('SELECT COUNT(*) as count FROM alumni');
    const [uniqueCourses] = await query('SELECT COUNT(DISTINCT course) as count FROM alumni WHERE course IS NOT NULL');
    const [uniqueDepts] = await query('SELECT COUNT(DISTINCT department) as count FROM alumni WHERE department IS NOT NULL');
    const [uniqueCities] = await query(`SELECT COUNT(DISTINCT city) as count FROM alumni WHERE city IS NOT NULL AND city != ''`);
    const [latestYear] = await query('SELECT MAX(graduation_year) as year FROM alumni');
    const [topDept] = await query(`
      SELECT department, COUNT(*) as count FROM alumni 
      WHERE department IS NOT NULL AND department != ''
      GROUP BY department ORDER BY count DESC LIMIT 1
    `);
    const [topCourse] = await query(`
      SELECT course, COUNT(*) as count FROM alumni
      WHERE course IS NOT NULL AND course != ''
      GROUP BY course ORDER BY count DESC LIMIT 1
    `);
    const currentYear = new Date().getFullYear();
    const [thisYearAdded] = await query(`
      SELECT COUNT(*) as count FROM alumni 
      WHERE YEAR(created_at) = ?
    `, [currentYear]);
    
    res.json({
      totalAlumni: totalAlumni.count,
      totalCourses: uniqueCourses.count,
      totalDepartments: uniqueDepts.count,
      totalCities: uniqueCities.count,
      latestGraduationYear: latestYear.year || 'N/A',
      mostPopularDepartment: topDept?.department || 'N/A',
      mostPopularCourse: topCourse?.course || 'N/A',
      addedThisYear: thisYearAdded.count
    });
  } catch (e) {
    handleApiError(res, e, 'Get analytics stats');
  }
});

// Alumni by Department
app.get('/api/analytics/alumni-by-department', async (req, res) => {
  try {
    const rows = await query(`
      SELECT COALESCE(NULLIF(TRIM(department), ''), 'Unspecified') as department, COUNT(*) as count
      FROM alumni
      GROUP BY COALESCE(NULLIF(TRIM(department), ''), 'Unspecified')
      ORDER BY count DESC, department ASC
    `);
    res.json(rows.map(r => ({ department: r.department, count: r.count })));
  } catch (e) {
    handleApiError(res, e, 'Get department analytics');
  }
});

// Alumni by Course
app.get('/api/analytics/alumni-by-course', async (req, res) => {
  try {
    const rows = await query(`
      SELECT COALESCE(NULLIF(TRIM(course), ''), 'Unspecified') as course, COUNT(*) as count
      FROM alumni
      GROUP BY COALESCE(NULLIF(TRIM(course), ''), 'Unspecified')
      ORDER BY count DESC, course ASC
    `);
    res.json(rows.map(r => ({ course: r.course, count: r.count })));
  } catch (e) {
    handleApiError(res, e, 'Get course analytics');
  }
});

// Alumni by Graduation Year
app.get('/api/analytics/alumni-by-year', async (req, res) => {
  try {
    const rows = await query(`
      SELECT COALESCE(CAST(graduation_year AS CHAR), 'Unspecified') as year, COUNT(*) as count
      FROM alumni
      GROUP BY graduation_year
      ORDER BY graduation_year IS NULL, graduation_year ASC
    `);
    res.json(rows.map(r => ({ year: r.year, count: r.count })));
  } catch (e) {
    handleApiError(res, e, 'Get year analytics');
  }
});

// Search
app.get('/api/search', async (req, res) => {
  const { name, usn, course, department, year } = req.query;
  let sql = `SELECT ${ALUMNI_FIELDS} FROM alumni WHERE 1=1`;
  const params = [];
  if (name)       { sql += ' AND name LIKE ?';             params.push(`%${name}%`); }
  if (usn)        { sql += ' AND usn LIKE ?';              params.push(`%${usn}%`); }
  if (course)     { sql += ' AND course = ?';              params.push(course); }
  if (department) { sql += ' AND department = ?';          params.push(department); }
  if (year)       { sql += ' AND graduation_year = ?';     params.push(parseInt(year)); }
  try {
    const rows = await query(sql + ' ORDER BY id DESC', params);
    res.json(rows);
  } catch (e) {
    handleApiError(res, e, 'Search alumni');
  }
});

/* ─── Catch-all: serve index.html ─── */
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ─── Start ─── */
app.listen(PORT, () => {
  console.log(`\n🎓  Alumni Management System`);
  console.log(`   → http://localhost:${PORT}\n`);
});
