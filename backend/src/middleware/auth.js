const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

/**
 * Verifies JWT and attaches `req.user` = { id, role, branchId }.
 * This is the single gate all protected routes pass through.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: no token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Re-check user is still active/exists on every request (defense against
    // disabled accounts still holding a valid old token)
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Unauthorized: account not found or disabled' });
    }

    req.user = { id: user.id, role: user.role, branchId: user.branchId, name: user.name, email: user.email };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized: invalid or expired token' });
  }
}

/**
 * Restricts a route to one or more roles.
 * Usage: requireRole('admin')  or  requireRole('admin', 'branch_manager')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

/**
 * Ensures a branch_manager can only ever touch their own branch's data.
 * Compares :branchId route param (or body.branchId) against req.user.branchId.
 * Admins bypass this check entirely (they can access any branch).
 */
function enforceBranchScope(req, res, next) {
  if (req.user.role === 'admin') return next();

  const requestedBranchId =
    req.params.branchId || req.body.branchId || req.query.branchId;

  if (requestedBranchId && requestedBranchId !== req.user.branchId) {
    return res.status(403).json({ message: 'Forbidden: cannot access another branch\'s data' });
  }
  next();
}

module.exports = { authenticate, requireRole, enforceBranchScope };
