const express = require('express');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { getDb } = require('../services/db');
const { encrypt, decrypt } = require('../services/crypto');
const {
  signAccessToken,
  signPartialToken,
  verifyPartialToken,
  createRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} = require('../services/jwt');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// POST /api/auth/login
router.post('/login', authLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    // Log failed attempt
    db.prepare(
      'INSERT INTO audit_log (user_id, action, detail, ip) VALUES (?, ?, ?, ?)'
    ).run(user?.id || null, 'login_failed', `username: ${username}`, req.ip);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.totp_enabled) {
    const partialToken = signPartialToken(user.id);
    return res.json({ partial_token: partialToken, requires_2fa: true });
  }

  // No 2FA — issue tokens directly
  const accessToken = signAccessToken(user);
  const refreshToken = createRefreshToken(user.id);

  db.prepare('UPDATE users SET last_login = unixepoch() WHERE id = ?').run(user.id);
  db.prepare(
    'INSERT INTO audit_log (user_id, action, ip) VALUES (?, ?, ?)'
  ).run(user.id, 'login_success', req.ip);

  res.json({ access_token: accessToken, refresh_token: refreshToken });
});

// POST /api/auth/verify-2fa
router.post('/verify-2fa', authLimiter, (req, res) => {
  const { partial_token, token } = req.body;
  if (!partial_token || !token) {
    return res.status(400).json({ error: 'partial_token and token required' });
  }

  let payload;
  try {
    payload = verifyPartialToken(partial_token);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired partial token' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
  if (!user || !user.totp_enabled || !user.totp_secret) {
    return res.status(401).json({ error: 'Invalid user or 2FA not configured' });
  }

  let secret;
  try {
    secret = decrypt(user.totp_secret);
  } catch {
    return res.status(500).json({ error: 'Failed to decrypt 2FA secret' });
  }

  const valid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  });

  if (!valid) {
    db.prepare(
      'INSERT INTO audit_log (user_id, action, ip) VALUES (?, ?, ?)'
    ).run(user.id, '2fa_failed', req.ip);
    return res.status(401).json({ error: 'Invalid 2FA code' });
  }

  const accessToken = signAccessToken(user);
  const refreshToken = createRefreshToken(user.id);

  db.prepare('UPDATE users SET last_login = unixepoch() WHERE id = ?').run(user.id);
  db.prepare(
    'INSERT INTO audit_log (user_id, action, ip) VALUES (?, ?, ?)'
  ).run(user.id, 'login_success_2fa', req.ip);

  res.json({ access_token: accessToken, refresh_token: refreshToken });
});

// POST /api/auth/refresh — rotate refresh token on each use
router.post('/refresh', authLimiter, (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token required' });
  }

  const tokenRow = validateRefreshToken(refresh_token);
  if (!tokenRow) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(tokenRow.user_id);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  // Revoke old refresh token and issue new pair
  revokeRefreshToken(refresh_token);
  const accessToken = signAccessToken(user);
  const newRefreshToken = createRefreshToken(user.id);

  res.json({ access_token: accessToken, refresh_token: newRefreshToken });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const { refresh_token } = req.body;
  if (refresh_token) {
    revokeRefreshToken(refresh_token);
  }
  res.json({ message: 'Logged out' });
});

// GET /api/auth/2fa/setup — generate TOTP secret + QR
router.get('/2fa/setup', authenticate, requireAdmin, async (req, res) => {
  const secret = speakeasy.generateSecret({
    name: `HomelabDash:${req.user.username}`,
    issuer: 'HomelabDash',
  });

  try {
    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Store pending secret in DB (works across cluster workers, auto-expires in 10min)
    const db = getDb();
    const expiresAt = Math.floor(Date.now() / 1000) + 600;
    db.prepare(
      'INSERT OR REPLACE INTO pending_totp (user_id, secret, expires_at) VALUES (?, ?, ?)'
    ).run(req.user.id, secret.base32, expiresAt);

    res.json({ qr_code: qrDataUrl, secret: secret.base32 });
  } catch {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// POST /api/auth/2fa/confirm
router.post('/2fa/confirm', authenticate, requireAdmin, (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'TOTP token required' });
  }

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const pending = db.prepare(
    'SELECT secret FROM pending_totp WHERE user_id = ? AND expires_at > ?'
  ).get(req.user.id, now);

  if (!pending) {
    return res.status(400).json({ error: 'No pending 2FA setup. Call /2fa/setup first.' });
  }
  const pendingSecret = pending.secret;

  const valid = speakeasy.totp.verify({
    secret: pendingSecret,
    encoding: 'base32',
    token,
    window: 1,
  });

  if (!valid) {
    return res.status(400).json({ error: 'Invalid TOTP code' });
  }

  const encryptedSecret = encrypt(pendingSecret);
  db.prepare('UPDATE users SET totp_secret = ?, totp_enabled = 1 WHERE id = ?')
    .run(encryptedSecret, req.user.id);

  // Clean up pending secret
  db.prepare('DELETE FROM pending_totp WHERE user_id = ?').run(req.user.id);

  db.prepare(
    'INSERT INTO audit_log (user_id, action, ip) VALUES (?, ?, ?)'
  ).run(req.user.id, '2fa_enabled', req.ip);

  res.json({ message: '2FA enabled successfully' });
});

module.exports = router;
