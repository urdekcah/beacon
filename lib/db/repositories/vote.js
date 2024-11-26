/**
 * @fileoverview Vote repository implementation.
 */

const BaseRepository = require('./base');
const VOTE_QUERIES = require('../queries/vote');

/**
 * Repository class for managing post votes.
 * @extends {BaseRepository}
 */
class VoteRepository extends BaseRepository {
  /**
   * Creates a new vote repository.
   * @param {DatabaseConnection} db
   */
  constructor(db) {
    super(db, VOTE_QUERIES);
  }

  /**
   * Gets user's vote for a post.
   * @param {number} postId
   * @param {number} userId
   * @returns {Promise<?Object>}
   */
  async getVote(postId, userId) {
    const votes = await this.execute_('GET', [postId, userId]);
    return votes[0] || null;
  }

  /**
   * Creates or updates a vote.
   * @param {number} postId
   * @param {number} userId
   * @param {number} voteType
   */
  async vote(postId, userId, voteType) {
    const existingVote = await this.getVote(postId, userId);

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        await this.execute_('DELETE', [postId, userId]);
      } else {
        await this.execute_('UPDATE', [voteType, postId, userId]);
      }
    } else {
      await this.execute_('CREATE', [postId, userId, voteType]);
    }
  }
}

module.exports = VoteRepository;