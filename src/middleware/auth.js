const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).redirect("/voyti");
  }
  next();
};

const requireAuthJson = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

module.exports = {
  requireAuth,
  requireAuthJson
};