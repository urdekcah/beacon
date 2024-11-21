const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).redirect("/voyti");
  }
  next();
};

module.exports = { requireAuth };