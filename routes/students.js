const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all students with search & filter
router.get('/', async (req, res) => {
    try {
        const { search, department, year, status, page = 1, limit = 10 } = req.query;
        let whereClauses = [];
        let params = [];

        if (search) {
            whereClauses.push('(name LIKE ? OR email LIKE ? OR rollNumber LIKE ?)');
            const searchVal = `%${search}%`;
            params.push(searchVal, searchVal, searchVal);
        }
        if (department) {
            whereClauses.push('department = ?');
            params.push(department);
        }
        if (year) {
            whereClauses.push('year = ?');
            params.push(Number(year));
        }
        if (status) {
            whereClauses.push('status = ?');
            params.push(status);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Get total count
        const [countRes] = await db.execute(`SELECT COUNT(*) as total FROM students ${whereSql}`, params);
        const total = countRes[0].total;

        // Get paginated data
        const offset = (Number(page) - 1) * Number(limit);
        const [students] = await db.execute(
            `SELECT * FROM students ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
            [...params, Number(limit), Number(offset)]
        );

        res.json({
            success: true,
            students,
            total,
            pages: Math.ceil(total / Number(limit)),
            currentPage: Number(page)
        });
    } catch (err) {
        console.error('API Error (students):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ✅ GET stats — MUST be before /:id to avoid route conflict
router.get('/stats/summary', async (req, res) => {
    try {
        const [[{ total }]] = await db.execute('SELECT COUNT(*) as total FROM students');
        const [[{ active }]] = await db.execute('SELECT COUNT(*) as active FROM students WHERE status = "Active"');
        const [byDept] = await db.execute('SELECT department as _id, COUNT(*) as count FROM students GROUP BY department ORDER BY count DESC');
        const [byYear] = await db.execute('SELECT year as _id, COUNT(*) as count FROM students GROUP BY year ORDER BY _id ASC');
        const [[{ avgGpa }]] = await db.execute('SELECT AVG(gpa) as avgGpa FROM students');

        res.json({
            success: true,
            stats: {
                total,
                active,
                byDept,
                byYear,
                avgGpa: Number(avgGpa || 0).toFixed(2)
            }
        });
    } catch (err) {
        console.error('API Error (students):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET single student
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM students WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });
        res.json({ success: true, student: rows[0] });
    } catch (err) {
        console.error('API Error (students):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST create student
router.post('/', async (req, res) => {
    try {
        const { name, email, rollNumber, phone, department, year, gender, gpa, status, address } = req.body;
        const [result] = await db.execute(
            'INSERT INTO students (name, email, rollNumber, phone, department, year, gender, gpa, status, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, email, rollNumber, phone || null, department, year, gender, gpa || 0, status || 'Active', address || null]
        );
        res.status(201).json({ success: true, student: { id: result.insertId, ...req.body }, message: 'Student added successfully' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Email or Roll Number already exists' });
        }
        res.status(400).json({ success: false, message: err.message });
    }
});

// PUT update student
router.put('/:id', async (req, res) => {
    try {
        const { name, email, rollNumber, phone, department, year, gender, gpa, status, address } = req.body;
        const [result] = await db.execute(
            'UPDATE students SET name=?, email=?, rollNumber=?, phone=?, department=?, year=?, gender=?, gpa=?, status=?, address=? WHERE id=?',
            [name, email, rollNumber, phone || null, department, year, gender, gpa || 0, status || 'Active', address || null, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Student not found' });
        res.json({ success: true, message: 'Student updated successfully' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Email or Roll Number already exists' });
        }
        res.status(400).json({ success: false, message: err.message });
    }
});

// DELETE student
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.execute('DELETE FROM students WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Student not found' });
        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (err) {
        console.error('API Error (students):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
