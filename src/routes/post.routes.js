const express = require('express');
const router = express.Router();
const { requireAuth, requireAuthJson } = require('../middleware/auth');

module.exports = (communityRepo, postRepo, voteRepo, csrfProtection) => {
  router.get("/b/:name/submit", requireAuth, csrfProtection, async (req, res) => {
    try {
      const community = await communityRepo.findByName(req.params.name);
      if (!community) {
        return res.status(404).json({ error: 'Community not found' });
      }

      const isMember = await communityRepo.isMember(community.id, req.session.userId);

      res.render("submit", {
        community,
        isMember,
        isLoggedIn: !!req.session.userId,
        csrfToken: req.csrfToken()
      });
    } catch (error) {
      console.error('Submit page error:', error);
      return res.status(500).end();
    }
  });

  router.get("/b/:name/:id", csrfProtection, async (req, res) => {
    try {
      const community = await communityRepo.findByName(req.params.name);
      if (!community) {
        return res.status(404).json({ error: 'Community not found' });
      }

      const posts = await postRepo.findByCommunityId(community.id);
      const post = posts.find(p => p.id === parseInt(req.params.id));

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      res.render("post", {
        community,
        post,
        isLoggedIn: !!req.session.userId,
        csrfToken: req.csrfToken()
      });
    } catch (error) {
      console.error('Post page error:', error);
      return res.status(500).end();
    }
  });

  router.post("/i/CreatePost", requireAuthJson, csrfProtection, async (req, res) => {
    const { title, content, targetLanguage, communityName } = req.body;
    const userId = req.session.userId;

    try {
      const community = await communityRepo.findByName(communityName);
      if (!community) {
        return res.status(400).json({ error: 'Community not found' });
      }

      const post = await postRepo.createPost({
        title,
        content,
        communityId: community.id,
        authorId: userId
      });

      res.status(201).json({
        success: true,
        id: post.id
      });
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({ 
        error: 'An error occurred while creating the post' 
      });
    }
  });

  router.post("/i/UpdatePostVoteState", requireAuthJson, csrfProtection, async (req, res) => {
    const { voteState } = req.body;
    const communityId = parseInt(req.body.communityId);
    const postId = parseInt(req.body.postId);
    const userId = req.session.userId;

    try {
      const community = await communityRepo.findById(communityId);
      if (!community) {
        return res.status(400).json({ error: 'Community not found' });
      }

      const post = await postRepo.findById(postId);
      if (!post) {
        return res.status(400).json({ error: 'Post not found' });
      }

      if (post.community_id !== communityId) {
        return res.status(400).json({ error: 'Post does not belong to this community' });
      }

      const voteValue = voteState === 'UP' ? 1 : -1;
      await voteRepo.vote(postId, userId, voteValue);
      const updatedPost = await postRepo.findById(postId);
      res.json({ success: true, vote_count: updatedPost.vote_count });
    } catch (error) {
      console.error('Vote error:', error);
      res.status(500).json({ error: 'An error occurred while processing your vote' });
    }
  });

  return router;
};