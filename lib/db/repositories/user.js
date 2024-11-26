/**
 * @fileoverview User repository implementation.
 */

const BaseRepository = require('./base');
const USER_QUERIES = require('../queries/users');

/**
 * User data transfer object.
 * @typedef {Object} UserDTO
 * @property {string} username
 * @property {string} email
 * @property {string} password
 * @property {string} birthdate
 * @property {string} nickname
 * @property {string=} bio
 */

/**
 * Repository for user-related database operations.
 */
class UserRepository extends BaseRepository {
  /**
   * Creates a new user repository.
   * @param {DatabaseConnection} db
   */
  constructor(db) {
    super(db, USER_QUERIES);
  }

  /**
   * Creates a new user.
   * @param {UserDTO} userData
   * @return {Promise<Object>}
   */
  async createUser(userData) {
    const { username, email, password, birthdate, nickname, bio } = userData;
    return this.execute_('CREATE', [username, email, password, birthdate, nickname, bio]);
  }

  /**
   * Finds a user by email.
   * @param {string} email
   * @return {Promise<Object|null>}
   */
  async findByEmail(email) {
    const users = await this.execute_('FIND_BY_EMAIL', [email]);
    return users[0] || null;
  }
}

module.exports = UserRepository;