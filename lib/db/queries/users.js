/**
 * @fileoverview User-related database queries.
 */

/** @const {Object<string, string>} */
const USER_QUERIES = {
  CREATE: `
    INSERT INTO users 
    (username, email, password, birth_date, nickname, bio) 
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  
  FIND_BY_EMAIL: `
    SELECT id, username, password, nickname 
    FROM users 
    WHERE email = ?
  `,
  
  FIND_BY_ID: `
    SELECT id, username, nickname, bio
    FROM users
    WHERE id = ?
  `,
  
  UPDATE_PROFILE: `
    UPDATE users
    SET nickname = ?, bio = ?
    WHERE id = ?
  `
};

module.exports = USER_QUERIES;