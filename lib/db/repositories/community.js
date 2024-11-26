/**
 * @fileoverview Community repository implementation.
 */

const BaseRepository = require('./base');
const COMMUNITY_QUERIES = require('../queries/communities');

/**
 * Community data transfer object.
 * @typedef {Object} CommunityDTO
 * @property {string} name
 * @property {string} description
 * @property {string} icon
 * @property {string} color
 * @property {Array<string>} tags
 * @property {number} creatorId
 */

/**
 * Repository for community-related database operations.
 */
class CommunityRepository extends BaseRepository {
  /**
   * Creates a new community repository.
   * @param {DatabaseConnection} db
   */
  constructor(db) {
    super(db, COMMUNITY_QUERIES);
  }

  /**
   * Creates a new community.
   * @param {CommunityDTO} communityData
   * @return {Promise<Object>}
   */
  async createCommunity(communityData) {
    const { name, description, icon, color, tags, creatorId } = communityData;
    return this.execute_('CREATE', [
      name,
      description,
      icon,
      color,
      JSON.stringify(tags),
      creatorId
    ]);
  }

  /**
   * Finds a community by id.
   * @param {number} id
   * @return {Promise<Object|null>}
   */
  async findById(id) {
    const communities = await this.execute_('FIND_BY_ID', [id]);
    return communities[0] || null;
  }

  /**
   * Finds a community by name.
   * @param {string} name
   * @return {Promise<Object|null>}
   */
  async findByName(name) {
    const communities = await this.execute_('FIND_BY_NAME', [name]);
    return communities[0] || null;
  }

  /**
   * Finds communities by user ID.
   * @param {number} userId
   * @return {Promise<Array<Object>>}
   */
  async getUserCommunities(userId) {
    return this.execute_('GET_USER_COMMUNITIES', [userId]);
  }
}

module.exports = CommunityRepository;