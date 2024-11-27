const { validationResult } = require("express-validator");

class CommunityController {
  constructor(communityRepo, userRepo) {
    this.communityRepo = communityRepo;
    this.userRepo = userRepo;
  }

  async createCommunity(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          errors: errors.array().reduce((acc, err) => {
            acc[err.param] = err.msg;
            return acc;
          }, {})
        });
      }

      const { name, description, color, icon } = req.body;
      const tags = req.body.tags.split(",").map(tag => tag.trim());
      const userId = req.session.userId;

      if (tags.length > 5) {
        return res.status(400).json({ 
          errors: { tags: 'You can only add up to 5 tags' }
        });
      }

      const result = await this.communityRepo.createCommunity({
        name, description, icon, color, tags, creatorId: userId
      });

      await this.communityRepo.addMember(result.insertId, userId);

      res.status(201).json({
        success: true,
        redirectUrl: `/b/${name}`
      });
    } catch (error) {
      console.error('Create community error:', error);
      res.status(500).json({
        error: 'An error occurred while creating the community'
      });
    }
  }

  async getCommunity(req, res) {
    try {
      const community = await this.communityRepo.findByName(req.params.name);
      if (!community) {
        return res.status(404).json({ error: 'Community not found' });
      }

      const postsResult = await this.communityRepo.getPosts(community.id);
      let isMember = false;
      let isAdmin = false;
      
      if (req.session.userId) {
        isMember = await this.communityRepo.isMember(community.id, req.session.userId);
        isAdmin = community.creator_id === req.session.userId;
      }

      res.render("board", {
        community,
        isMember,
        isAdmin,
        isLoggedIn: !!req.session.userId,
        csrfToken: req.csrfToken(),
        posts: postsResult
      });
    } catch (error) {
      console.error('Community page error:', error);
      return res.status(500).end();
    }
  }
}

module.exports = CommunityController;