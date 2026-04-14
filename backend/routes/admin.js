const express = require('express');
const bcryptjs = require('bcryptjs');
const pool = require('../database');
const { requireAdmin } = require('../middleware');

const router = express.Router();

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id, username, password_hash FROM admin_users WHERE username = ? AND is_active = TRUE',
      [username.toLowerCase()]
    );
    connection.release();

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = rows[0];
    const passwordMatch = await bcryptjs.compare(password, admin.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set session
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;

    return res.json({ token: req.sessionID, message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/reservations
router.get('/reservations', requireAdmin, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [reservations] = await connection.query(`
      SELECT 
        r.id,
        r.reservation_code AS id,
        c.full_name AS nom,
        c.email,
        c.phone AS tel,
        r.lodging_type AS type,
        r.checkin_date AS checkin,
        r.checkout_date AS checkout,
        r.amount_tnd AS prix,
        r.status AS statut,
        r.created_at AS created_at
      FROM reservations r
      JOIN clients c ON r.client_id = c.id
      ORDER BY r.created_at DESC
    `);
    connection.release();

    return res.json(reservations);
  } catch (error) {
    console.error('Get reservations error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/reservations/:id/status
router.patch('/reservations/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'canceled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const connection = await pool.getConnection();
    await connection.query(
      'UPDATE reservations SET status = ? WHERE reservation_code = ?',
      [status, id]
    );
    connection.release();

    return res.json({ message: 'Status updated' });
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/reservations/:id
router.delete('/reservations/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    await connection.query(
      'DELETE FROM reservations WHERE reservation_code = ?',
      [id]
    );
    connection.release();

    return res.json({ message: 'Reservation deleted' });
  } catch (error) {
    console.error('Delete reservation error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/clients
router.get('/clients', requireAdmin, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [clients] = await connection.query(`
      SELECT 
        c.full_name AS nom,
        c.email,
        c.phone AS tel,
        COUNT(r.id) AS count,
        SUM(CASE WHEN r.status != 'canceled' THEN r.amount_tnd ELSE 0 END) AS spent,
        MIN(r.created_at) AS firstDate,
        MAX(r.created_at) AS lastDate
      FROM clients c
      LEFT JOIN reservations r ON c.id = r.client_id
      GROUP BY c.id, c.email
      ORDER BY spent DESC
    `);
    connection.release();

    return res.json(clients);
  } catch (error) {
    console.error('Get clients error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/revenue
router.get('/revenue', requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;

    const connection = await pool.getConnection();
    let query = 'SELECT SUM(amount_tnd) AS total FROM reservations WHERE status != "canceled"';
    const params = [];

    if (from) {
      query += ' AND DATE(created_at) >= ?';
      params.push(from);
    }

    if (to) {
      query += ' AND DATE(created_at) <= ?';
      params.push(to);
    }

    const [result] = await connection.query(query, params);
    connection.release();

    return res.json({ revenue: result[0]?.total || 0 });
  } catch (error) {
    console.error('Get revenue error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    return res.json({ message: 'Logged out' });
  });
});

module.exports = router;
