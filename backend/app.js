const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const adminRoutes = require('./routes/admin');
const reservationRoutes = require('./routes/reservations');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5500', 'http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/reservations', reservationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend Camping Outdoors lancé sur http://localhost:${PORT}`);
  console.log(`   Admin login: POST /api/admin/login`);
  console.log(`   Health check: GET /api/health`);
});
