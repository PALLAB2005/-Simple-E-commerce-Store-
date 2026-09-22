function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin" || req.session.user.is_active === 0) {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
}

module.exports = { requireAdmin };
