const { validateToken } = require('./authStore');

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  const admin = validateToken(token);
  if (!admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.admin = admin;
  next();
}

module.exports = { requireAdmin };
