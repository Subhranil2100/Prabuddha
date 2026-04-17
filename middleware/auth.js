const jwt = require('jsonwebtoken');

/**
 * Protect a route — requires a valid Bearer JWT.
 */
function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authorised — no token' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;   // { user_id, email, role }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Restrict access to certain roles.
 * Usage: router.get('/admin', protect, restrictTo('admin','organizer'), handler)
 */
function restrictTo(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden — insufficient role' });
    }
    next();
  };
}

module.exports = { protect, restrictTo };
