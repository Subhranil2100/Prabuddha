// routes/registrations.js
const express  = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/registrations ──────────────────────────────────
// Register logged-in user for one or more events
router.post(
  '/',
  protect,
  [
    body('event_ids')
      .isArray({ min: 1 })
      .withMessage('event_ids must be a non-empty array'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { event_ids } = req.body;
    const user_id = req.user.user_id;

    try {
      // Verify all events exist
      const { data: events, error: evErr } = await supabase
        .from('events')
        .select('event_id')
        .in('event_id', event_ids);

      if (evErr) throw evErr;
      if (events.length !== event_ids.length)
        return res.status(400).json({ error: 'One or more event IDs are invalid' });

      // Bulk insert — ignore duplicates via onConflict ignore
      const rows = event_ids.map(event_id => ({ user_id, event_id }));
      const { data, error } = await supabase
        .from('registrations')
        .insert(rows)
        .select();

      if (error) {
        if (error.code === '23505')
          return res.status(409).json({ error: 'Already registered for one or more of these events' });
        throw error;
      }

      res.status(201).json({ message: 'Registration successful', registrations: data });
    } catch (err) {
      console.error('Registration error:', err.message);
      res.status(500).json({ error: 'Failed to register' });
    }
  }
);

// ── GET /api/registrations/me ────────────────────────────────
// Get all events the logged-in user has registered for
router.get('/me', protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select(`
        registration_id,
        timestamp,
        events (event_id, name, category, schedule, venue, prize)
      `)
      .eq('user_id', req.user.user_id)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// ── GET /api/registrations — Admin: all registrations ────────
router.get('/', protect, restrictTo('admin', 'organizer'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select(`
        registration_id,
        timestamp,
        users (user_id, name, email, college, year, role),
        events (event_id, name, category)
      `)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    res.json({ count: data.length, registrations: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// ── DELETE /api/registrations/:id — user can cancel own ──────
router.delete('/:id', protect, async (req, res) => {
  try {
    // Fetch first to confirm ownership
    const { data: reg, error: findErr } = await supabase
      .from('registrations')
      .select('user_id')
      .eq('registration_id', req.params.id)
      .single();

    if (findErr || !reg)
      return res.status(404).json({ error: 'Registration not found' });

    const isOwner = reg.user_id === req.user.user_id;
    const isAdmin = ['admin', 'organizer'].includes(req.user.role);
    if (!isOwner && !isAdmin)
      return res.status(403).json({ error: 'Not allowed' });

    const { error } = await supabase
      .from('registrations')
      .delete()
      .eq('registration_id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Registration cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel registration' });
  }
});

module.exports = router;