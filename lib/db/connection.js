/**
 * @fileoverview Database connection management module.
 */

const mysql = require('mysql2/promise');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

/**
 * Configuration for database connection.
 * @typedef {Object} DbConfig
 * @property {string} host - Database host
 * @property {string} user - Database user
 * @property {string} password - Database password
 * @property {string} database - Database name
 */

/**
 * Manages database connections and session store.
 */
class DatabaseConnection {
  /**
   * Creates a new database connection manager.
   * @param {DbConfig} config - Database configuration
   */
  constructor(config) {
    /** @private {DbConfig} */
    this.config_ = config;
    /** @private {mysql.Pool} */
    this.pool_ = null;
    /** @private {MySQLStore} */
    this.sessionStore_ = null;
  }

  /**
   * Initializes database connection and session store.
   * @return {Promise<DatabaseConnection>}
   * @throws {Error} If connection fails
   */
  async initialize() {
    try {
      this.pool_ = mysql.createPool(this.config_);
      this.sessionStore_ = new MySQLStore({}, this.pool_);
      
      // Verify connection
      await this.pool_.getConnection().then(conn => conn.release());
      return this;
    } catch (error) {
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  /**
   * Gets the connection pool.
   * @return {mysql.Pool}
   */
  getPool() {
    return this.pool_;
  }

  /**
   * Gets the session store.
   * @return {MySQLStore}
   */
  getSessionStore() {
    return this.sessionStore_;
  }

  /**
   * Executes a function within a transaction.
   * @param {function(mysql.Connection): Promise<T>} callback
   * @return {Promise<T>}
   * @template T
   */
  async transaction(callback) {
    const connection = await this.pool_.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = DatabaseConnection;