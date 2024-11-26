/**
 * @fileoverview Base repository class.
 */

/**
 * Base repository class with common database operations.
 */
class BaseRepository {
  /**
   * Creates a new repository instance.
   * @param {DatabaseConnection} db - Database connection
   * @param {Object<string, string>} queries - SQL queries
   */
  constructor(db, queries) {
    /** @protected {DatabaseConnection} */
    this.db_ = db;
    /** @protected {Object<string, string>} */
    this.queries_ = queries;
  }

  /**
   * Executes a query with parameters.
   * @param {string} queryName - Name of the query to execute
   * @param {Array<*>} params - Query parameters
   * @return {Promise<Array>}
   * @protected
   */
  async execute_(queryName, params = []) {
    const connection = await this.db_.getPool().getConnection();
    try {
      const [result] = await connection.execute(this.queries_[queryName], params);
      return result;
    } finally {
      connection.release();
    }
  }
}

module.exports = BaseRepository;