const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 900000, // 15 min
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter };
