const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./db');

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function signPartialToken(userId) {
  // Short-lived token for the 2FA step
  return jwt.sign(
    { sub: userId, partial: true },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '5m' }
  );
}

function verifyPartialToken(token) {
  const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  if (!payload.partial) throw new Error('Not a partial token');
  return payload;
}

function createRefreshToken(userId) {
  const db = getDb();
  const raw = crypto.randomBytes(48).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const id = uuidv4();
  const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days

  db.prepare(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
  ).run(id, userId, hash, expiresAt);

  return raw;
}

function validateRefreshToken(raw) {
  const db = getDb();
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const now = Math.floor(Date.now() / 1000);

  const row = db.prepare(
    'SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > ?'
  ).get(hash, now);

  return row || null;
}

function revokeRefreshToken(raw) {
  const db = getDb();
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hash);
}

function revokeAllUserTokens(userId) {
  const db = getDb();
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
}

// Cleanup expired tokens periodically
function cleanupExpiredTokens() {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  db.prepare('DELETE FROM refresh_tokens WHERE expires_at <= ?').run(now);
  // Clean up expired pending TOTP setup secrets
  try {
    db.prepare('DELETE FROM pending_totp WHERE expires_at <= ?').run(now);
  } catch {}
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  signPartialToken,
  verifyPartialToken,
  createRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens,
};
