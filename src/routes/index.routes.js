const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

module.exports = (communityRepo, postRepo, csrfProtection) => {
  router.get("/", (req, res) => {
    if (req.session.userId)
      return res.redirect("/feed");
    return res.render("index");
  });

  router.get("/dobro-pozhalovat", (req, res) => {
    res.render("welcome");
  });

  router.get("/feed", requireAuth, csrfProtection, async (req, res) => {
    try {
      const userId = req.session.userId;
      const communities = await communityRepo.getUserCommunities(userId);
      const communityIds = communities.map(c => c.id);

      let posts = [];
      if (communityIds.length > 0) {
        posts = await postRepo.findByCommunityIds(communityIds);
      }

      res.render('feed', {
        communities,
        posts,
        csrfToken: req.csrfToken(),
        isLoggedIn: true
      });
    } catch (error) {
      console.error('Feed page error:', error);
      res.status(500).end();
    }
  });

  return router;
};