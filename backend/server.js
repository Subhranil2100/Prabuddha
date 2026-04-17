require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');

const authRoutes          = require('./routes/auth');
const eventRoutes         = require('./routes/events');
const registrationRoutes  = require('./routes/registrations');
const queryRoutes         = require('./routes/queries');
const userRoutes          = require('./routes/users');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limit — 100 req / 15 min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Health check ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', project: 'PRABUDDHA 2026 API' });
});

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/events',        eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/queries',       queryRoutes);
app.use('/api/users',         userRoutes);

// ── 404 handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀  PRABUDDHA 2026 API running on http://localhost:${PORT}`);
  console.log(`    Environment: ${process.env.NODE_ENV || 'development'}\n`);
});