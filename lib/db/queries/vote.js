/**
 * @fileoverview Vote-related database queries.
 */

/** @const {Object<string, string>} */
const VOTE_QUERIES = {
  GET: `
    SELECT vote_type FROM votes 
    WHERE post_id = ? AND user_id = ?
  `,
  
  CREATE: `
    INSERT INTO votes 
    (post_id, user_id, vote_type) 
    VALUES (?, ?, ?)
  `,
  
  UPDATE: `
    UPDATE votes 
    SET vote_type = ? 
    WHERE post_id = ? AND user_id = ?
  `,
  
  DELETE: `
    DELETE FROM votes 
    WHERE post_id = ? AND user_id = ?
  `
};

module.exports = VOTE_QUERIES;