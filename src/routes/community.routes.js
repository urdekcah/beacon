const express = require('express');
const router = express.Router();
const { createCommunityValidation } = require('../validators/community.validator');
const { requireAuth, requireAuthJson } = require('../middleware/auth');

module.exports = (communityRepo, communityController, csrfProtection, config) => {
  router.get("/sozdat", requireAuth, csrfProtection, (req, res) => {
    res.render("create", {
      colors: config["community"]["allowed_colors"],
      icons: config["community"]["allowed_icons"],
      csrfToken: req.csrfToken()
    });
  });

  router.post(
    "/sozdat",
    requireAuth,
    csrfProtection,
    createCommunityValidation,
    communityController.createCommunity.bind(communityController)
  );

  router.get("/b/:name", csrfProtection, communityController.getCommunity.bind(communityController));

  router.post("/i/UpdateSubscriptions", requireAuthJson, csrfProtection, async (req, res) => {
    const { communityId, subscribeState } = req.body;
    const userId = req.session.userId;

    try {
      const community = await communityRepo.findById(communityId);
      if (!community) {
        return res.status(400).json({ error: 'Community not found' });
      }

      const membership = await communityRepo.isMember(communityId, userId);

      if (subscribeState === 'SUBSCRIBED') {
        if (membership) {
          return res.status(400).json({ error: 'Already subscribed' });
        }
        await communityRepo.addMember(communityId, userId);
      } 
      else if (subscribeState === 'NONE') {
        if (community.creator_id === userId) {
          return res.status(400).json({ error: 'Owner cannot unsubscribe' });
        }
        if (!membership) {
          return res.status(400).json({ error: 'Not subscribed' });
        }
        await communityRepo.removeMember(communityId, userId);
      }
      else {
        return res.status(400).json({ error: 'Invalid subscription state' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Update subscriptions error:', error);
      res.status(500).json({ error: 'An error occurred while updating subscriptions' });
    }
  });

  return router;
};