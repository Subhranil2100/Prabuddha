// routes/queries.js
const express  = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const supabase = require('../config/supabase');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Rate-limit query submissions — max 5 per 15 minutes per IP
const queryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many queries submitted. Please wait 15 minutes.' },
});

// ── POST /api/queries — public (guest or logged-in) ──────────
router.post(
  '/',
  queryLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('question').trim().isLength({ min: 10 }).withMessage('Question must be at least 10 characters'),
    body('subject').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { name, email, subject, question } = req.body;

    // Optionally attach user_id if logged in (token provided but not required)
    let user_id = null;
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
        user_id = decoded.user_id;
      } catch { /* anonymous — fine */ }
    }

    try {
      const { data, error } = await supabase
        .from('queries')
        .insert({ user_id, name, email, subject, question })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ message: 'Query submitted successfully', query_id: data.query_id });
    } catch (err) {
      console.error('Query submit error:', err.message);
      res.status(500).json({ error: 'Failed to submit query' });
    }
  }
);

// ── GET /api/queries — Admin: view all queries ───────────────
router.get('/', protect, restrictTo('admin', 'organizer'), async (req, res) => {
  const { status } = req.query;   // ?status=Pending | Resolved
  try {
    let qb = supabase
      .from('queries')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) qb = qb.eq('status', status);

    const { data, error } = await qb;
    if (error) throw error;

    res.json({ count: data.length, queries: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch queries' });
  }
});

// ── PUT /api/queries/:id/respond — Admin responds ────────────
router.put(
  '/:id/respond',
  protect,
  restrictTo('admin', 'organizer'),
  [
    body('response').trim().notEmpty().withMessage('Response text required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const { data, error } = await supabase
        .from('queries')
        .update({ response: req.body.response, status: 'Resolved' })
        .eq('query_id', req.params.id)
        .select()
        .single();

      if (error || !data)
        return res.status(404).json({ error: 'Query not found' });

      res.json({ message: 'Query resolved', query: data });
    } catch (err) {
      res.status(500).json({ error: 'Failed to respond to query' });
    }
  }
);

module.exports = router;