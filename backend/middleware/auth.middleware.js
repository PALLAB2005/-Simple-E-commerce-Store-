function requireLogin(req, res, next) {
  if (!req.session.user || req.session.user.is_active === 0) {
    return res.status(401).json({ message: "Please login first." });
  }
  next();
}

module.exports = { requireLogin };
