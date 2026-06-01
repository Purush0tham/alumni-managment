/**
 * Alumni Management System — server.js
 * Node.js + Express backend with MySQL
 */

const express = require('express');
const mysql   = require('mysql2');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = 3000;

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
});

/* ─── Helper ─── */
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

/* ─── Routes ─── */

// GET all alumni
app.get('/api/alumni', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM alumni ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET single alumni
app.get('/api/alumni/:id', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM alumni WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST — add alumni
app.post('/api/alumni', async (req, res) => {
  const { name, email, phone, course, graduation_year } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const result = await query(
      'INSERT INTO alumni (name, email, phone, course, graduation_year) VALUES (?, ?, ?, ?, ?)',
      [name, email || null, phone || null, course || null, graduation_year || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Alumni added' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT — update alumni
app.put('/api/alumni/:id', async (req, res) => {
  const { name, email, phone, course, graduation_year } = req.body;
  try {
    await query(
      'UPDATE alumni SET name=?, email=?, phone=?, course=?, graduation_year=? WHERE id=?',
      [name, email || null, phone || null, course || null, graduation_year || null, req.params.id]
    );
    res.json({ message: 'Alumni updated' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE — remove alumni
app.delete('/api/alumni/:id', async (req, res) => {
  try {
    await query('DELETE FROM alumni WHERE id = ?', [req.params.id]);
    res.json({ message: 'Alumni deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Search
app.get('/api/search', async (req, res) => {
  const { name, course, year } = req.query;
  let sql = 'SELECT * FROM alumni WHERE 1=1';
  const params = [];
  if (name)   { sql += ' AND name LIKE ?';             params.push(`%${name}%`); }
  if (course) { sql += ' AND course = ?';              params.push(course); }
  if (year)   { sql += ' AND graduation_year = ?';     params.push(parseInt(year)); }
  try {
    const rows = await query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Catch-all: serve index.html ─── */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ─── Start ─── */
app.listen(PORT, () => {
  console.log(`\n🎓  Alumni Management System`);
  console.log(`   → http://localhost:${PORT}\n`);
});
