const express  = require('express');
const { body, query, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/events ─────────────────────────────────────────
// Public — supports ?category=Coding&search=robot&sort=schedule&order=asc&upcoming=true
router.get('/', async (req, res) => {
  try {
    const { category, search, sort = 'schedule', order = 'asc', upcoming } = req.query;

    let qb = supabase.from('events').select('*');

    // Filter by category
    if (category) qb = qb.ilike('category', `%${category}%`);

    // Full-text search on name + description
    if (search) {
      qb = qb.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Show only upcoming events
    if (upcoming === 'true') {
      qb = qb.gte('schedule', new Date().toISOString());
    }

    // Sort
    const validSorts = ['schedule', 'name', 'category', 'created_at'];
    const sortCol = validSorts.includes(sort) ? sort : 'schedule';
    qb = qb.order(sortCol, { ascending: order !== 'desc' });

    const { data, error } = await qb;
    if (error) throw error;

    res.json({ count: data.length, events: data });
  } catch (err) {
    console.error('Get events error:', err.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// ── GET /api/events/:id ──────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('event_id', req.params.id)
      .single();

    if (error || !data)
      return res.status(404).json({ error: 'Event not found' });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// ── POST /api/events — Admin only ───────────────────────────
router.post(
  '/',
  protect,
  restrictTo('admin', 'organizer'),
  [
    body('name').trim().notEmpty(),
    body('category').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('schedule').isISO8601().withMessage('schedule must be ISO8601 date'),
    body('venue').trim().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { name, category, description, rules, schedule, venue, prize } = req.body;

    try {
      const { data, error } = await supabase
        .from('events')
        .insert({ name, category, description, rules, schedule, venue, prize })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (err) {
      console.error('Create event error:', err.message);
      res.status(500).json({ error: 'Failed to create event' });
    }
  }
);

// ── PUT /api/events/:id — Admin only ────────────────────────
router.put('/:id', protect, restrictTo('admin', 'organizer'), async (req, res) => {
  const { name, category, description, rules, schedule, venue, prize } = req.body;
  try {
    const { data, error } = await supabase
      .from('events')
      .update({ name, category, description, rules, schedule, venue, prize })
      .eq('event_id', req.params.id)
      .select()
      .single();

    if (error || !data)
      return res.status(404).json({ error: 'Event not found' });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// ── DELETE /api/events/:id — Admin only ─────────────────────
router.delete('/:id', protect, restrictTo('admin', 'organizer'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('event_id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;