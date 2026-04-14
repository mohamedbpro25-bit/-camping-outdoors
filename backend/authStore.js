const crypto = require('crypto');

const tokens = new Map();
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12h

function issueToken(adminId, username) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  tokens.set(token, { adminId, username, expiresAt });
  return token;
}

function validateToken(token) {
  if (!token) return null;
  const entry = tokens.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tokens.delete(token);
    return null;
  }
  return entry;
}

function revokeToken(token) {
  if (!token) return;
  tokens.delete(token);
}

module.exports = {
  issueToken,
  validateToken,
  revokeToken
};
