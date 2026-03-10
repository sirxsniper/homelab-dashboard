const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const { initialize } = require('./services/db');
const { startPolling } = require('./services/poller');
const { cleanupExpiredTokens } = require('./services/jwt');
const { authenticate } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const appsRoutes = require('./routes/apps');
const statsRoutes = require('./routes/stats');
const usersRoutes = require('./routes/users');
const auditRoutes = require('./routes/audit');
const calendarRoutes = require('./routes/calendar');
const searxngRoutes = require('./routes/searxng');
const { router: streamRouter } = require('./routes/stream');

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers on ALL routes (including SSE)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
}));

// Trust proxy (behind Nginx)
app.set('trust proxy', 1);

// SSE route — mounted before compression (compression kills SSE streaming)
app.use('/api/stream', streamRouter);

// Compression for all other routes
app.use(compression());

// CORS — restrict to same origin (frontend served via Nginx on same host)
app.use(cors({
  origin: false,
  credentials: false,
}));

// Body parsing with size limit
app.use(express.json({ limit: '100kb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/apps', appsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/searxng', searxngRoutes);

// Health check — no sensitive info
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Connector types list — requires auth
app.get('/api/connectors', authenticate, (req, res) => {
  const connectors = require('./connectors');
  res.json(connectors.list());
});

// Initialize database
initialize();

// Start polling
startPolling();

// Cleanup expired tokens every hour
setInterval(cleanupExpiredTokens, 3600000);

// Start server
const BIND = process.env.BIND_HOST || '127.0.0.1';
app.listen(PORT, BIND, () => {
  console.log(`[Server] Homelab Dashboard API running on http://${BIND}:${PORT}`);
});
