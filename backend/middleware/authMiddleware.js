const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided.' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};

const ownerMiddleware = (req, res, next) => {
  if (req.user && (req.user.role === 'Car Owner' || req.user.role === 'Admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Car Owner only.' });
  }
};

// ── Staff Role Permission Map ──────────────────────────────────
const STAFF_PERMISSIONS = {
  'Booking Manager':            ['bookings'],
  'Feedback Manager':           ['feedback'],
  'Vehicle Manager':            ['fleet'],
  'Vehicle Validation Manager': ['validation'],
  'Payment Manager':            ['payments'],
  'Report Handling Manager':    ['analytics', 'report'],
};

// Admin = full access, Staff = scoped access by staffRole
const adminOrStaffMiddleware = (allowedScopes) => (req, res, next) => {
  if (req.user?.role === 'Admin') return next();
  
  if (req.user?.role === 'Staff') {
    const staffPerms = STAFF_PERMISSIONS[req.user.staffRole] || [];
    const hasAccess = allowedScopes.some(s => staffPerms.includes(s));
    if (hasAccess) return next();
  }
  
  res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  ownerMiddleware,
  adminOrStaffMiddleware,
  STAFF_PERMISSIONS
};
