const mysql = require("mysql2/promise");

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

class Database {
  static async initialize() {
    const pool = mysql.createPool(dbConfig);
    return pool;
  }
}

module.exports = { Database, dbConfig };