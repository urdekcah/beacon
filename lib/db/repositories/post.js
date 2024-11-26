/**
 * @fileoverview Post repository implementation.
 */

const BaseRepository = require('./base');
const POST_QUERIES = require('../queries/post');

/**
 * Repository class for managing posts.
 * @extends {BaseRepository}
 */
class PostRepository extends BaseRepository {
  /**
   * Creates a new post repository.
   * @param {DatabaseConnection} db
   */
  constructor(db) {
    super(db, POST_QUERIES);
  }

  /**
   * Finds a post by its ID.
   * @param {number} id - The ID of the post
   * @returns {Promise<?Object>} The post object or null if not found 
   */
  async findById(id) {
    const posts = await this.execute_('FIND_BY_ID', [id]);
    return posts[0] || null;
  }

  /**
   * Finds posts by community name.
   * @param {number} communityName - The name of the community
   * @returns {Promise<Array<Object>>} The list of posts
   */
  async findByCommunityId(communityId) {
    const posts = await this.execute_('FIND_BY_COMMUNITY', [communityId]);
    return posts;
  }

  /**
   * Creates a new post.
   * @param {Object} postData Post creation data
   * @returns {Promise<Object>} The created post
   */
  async createPost(postData) {
    const { title, content, authorId, communityId } = postData;
    const result = await this.execute_('CREATE', [
      title,
      content,
      authorId,
      communityId
    ]);
    return { ...postData, id: result.insertId };
  }
}

module.exports = PostRepository;