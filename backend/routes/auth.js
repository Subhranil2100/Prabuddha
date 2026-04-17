// routes/auth.js
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');

const router = express.Router();

// ── helpers ─────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { user_id: user.user_id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ── POST /api/auth/register ──────────────────────────────────
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('college').trim().notEmpty().withMessage('College is required'),
    body('year').isInt({ min: 1, max: 6 }).withMessage('Year must be 1–6'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
    body('role')
      .optional()
      .isIn(['participant', 'admin', 'volunteer', 'faculty', 'organizer'])
      .withMessage('Invalid role'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { name, email, phone, college, year, password, role = 'participant' } = req.body;

    try {
      // Check duplicate email
      const { data: existing } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', email)
        .single();

      if (existing)
        return res.status(409).json({ error: 'Email already registered' });

      const hashed = await bcrypt.hash(password, 12);

      const { data: user, error } = await supabase
        .from('users')
        .insert({ name, email, phone, college, year, password: hashed, role })
        .select('user_id, name, email, role')
        .single();

      if (error) throw error;

      const token = signToken(user);
      res.status(201).json({ token, user });
    } catch (err) {
      console.error('Register error:', err.message);
      res.status(500).json({ error: 'Server error during registration' });
    }
  }
);

// ── POST /api/auth/login ─────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !user)
        return res.status(401).json({ error: 'Invalid email or password' });

      const match = await bcrypt.compare(password, user.password);
      if (!match)
        return res.status(401).json({ error: 'Invalid email or password' });

      const token = signToken(user);
      const { password: _pw, ...safeUser } = user;   // strip password from response
      res.json({ token, user: safeUser });
    } catch (err) {
      console.error('Login error:', err.message);
      res.status(500).json({ error: 'Server error during login' });
    }
  }
);

module.exports = router;