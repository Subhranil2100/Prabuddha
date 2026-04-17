// routes/users.js
const express  = require('express');
const supabase = require('../config/supabase');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/users/me ────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, name, email, phone, college, year, role, created_at')
      .eq('user_id', req.user.user_id)
      .single();

    if (error || !data)
      return res.status(404).json({ error: 'User not found' });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── GET /api/users — Admin: list all users ───────────────────
router.get('/', protect, restrictTo('admin', 'organizer'), async (req, res) => {
  const { role } = req.query;   // ?role=participant
  try {
    let qb = supabase
      .from('users')
      .select('user_id, name, email, phone, college, year, role, created_at')
      .order('created_at', { ascending: false });

    if (role) qb = qb.eq('role', role);

    const { data, error } = await qb;
    if (error) throw error;

    res.json({ count: data.length, users: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ── GET /api/users/:id — Admin ───────────────────────────────
router.get('/:id', protect, restrictTo('admin', 'organizer'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, name, email, phone, college, year, role, created_at')
      .eq('user_id', req.params.id)
      .single();

    if (error || !data)
      return res.status(404).json({ error: 'User not found' });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ── PUT /api/users/:id/role — Admin: change role ─────────────
router.put('/:id/role', protect, restrictTo('admin'), async (req, res) => {
  const validRoles = ['participant', 'admin', 'volunteer', 'faculty', 'organizer'];
  const { role } = req.body;

  if (!validRoles.includes(role))
    return res.status(400).json({ error: 'Invalid role' });

  try {
    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('user_id', req.params.id)
      .select('user_id, name, email, role')
      .single();

    if (error || !data)
      return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'Role updated', user: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

module.exports = router;