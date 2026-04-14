const express = require('express');
const { v4: uuid } = require('uuid');
const pool = require('../database');

const router = express.Router();

// POST /api/reservations - Créer une nouvelle réservation
router.post('/', async (req, res) => {
  try {
    const {
      nom,
      email,
      tel,
      type,
      checkin,
      checkout,
      adults,
      children,
      electricity,
      prix,
      notes
    } = req.body;

    // Validation basique
    if (!nom || !email || !tel || !type || !checkin || !checkout || !prix) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection = await pool.getConnection();

    // Vérifier ou créer le client
    let [existingClients] = await connection.query(
      'SELECT id FROM clients WHERE email = ?',
      [email]
    );

    let clientId;
    if (existingClients.length > 0) {
      clientId = existingClients[0].id;
      // Mettre à jour le client
      await connection.query(
        'UPDATE clients SET full_name = ?, phone = ?, updated_at = NOW() WHERE id = ?',
        [nom, tel, clientId]
      );
    } else {
      // Créer un nouveau client
      const [result] = await connection.query(
        'INSERT INTO clients (full_name, email, phone, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [nom, email, tel]
      );
      clientId = result.insertId;
    }

    // Générer code de réservation
    const reservationCode = `${process.env.RESERVATION_CODE_PREFIX}-${new Date().getFullYear()}-${uuid().substring(0, 5).toUpperCase()}`;

    // Créer la réservation
    const [result] = await connection.query(
      `INSERT INTO reservations 
       (reservation_code, client_id, lodging_type, checkin_date, checkout_date, adults, children, electricity_option, amount_tnd, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, NOW(), NOW())`,
      [
        reservationCode,
        clientId,
        type,
        checkin,
        checkout,
        adults || 1,
        children || 0,
        electricity ? 1 : 0,
        prix,
        notes || ''
      ]
    );

    connection.release();

    return res.status(201).json({
      id: reservationCode,
      nom,
      email,
      checkin,
      checkout,
      prix,
      message: 'Reservation created'
    });
  } catch (error) {
    console.error('Create reservation error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reservations/:code - Récupérer une réservation par code
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const connection = await pool.getConnection();
    const [reservations] = await connection.query(
      `SELECT 
        r.id,
        r.reservation_code,
        c.full_name AS nom,
        c.email,
        c.phone AS tel,
        r.lodging_type AS type,
        r.checkin_date AS checkin,
        r.checkout_date AS checkout,
        r.adults,
        r.children,
        r.electricity_option AS electricity,
        r.amount_tnd AS prix,
        r.status AS statut,
        r.notes,
        r.created_at,
        r.canceled_at
      FROM reservations r
      JOIN clients c ON r.client_id = c.id
      WHERE r.reservation_code = ?`,
      [code.toUpperCase()]
    );
    connection.release();

    if (!reservations.length) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    return res.json(reservations[0]);
  } catch (error) {
    console.error('Get reservation error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/reservations/:code/cancel - Annuler une réservation
router.post('/:code/cancel', async (req, res) => {
  try {
    const { code } = req.params;

    const connection = await pool.getConnection();
    await connection.query(
      'UPDATE reservations SET status = ?, canceled_at = NOW(), updated_at = NOW() WHERE reservation_code = ?',
      ['canceled', code.toUpperCase()]
    );
    connection.release();

    return res.json({ message: 'Reservation canceled' });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
