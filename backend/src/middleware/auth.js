const { verifyAccessToken } = require('../services/jwt');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    // C3 fix: reject partial tokens (pre-2FA) on authenticated endpoints
    if (payload.partial) {
      return res.status(401).json({ error: 'Complete 2FA verification first' });
    }

    req.user = { id: payload.sub, username: payload.username, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authenticate };
