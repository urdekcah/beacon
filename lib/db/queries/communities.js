/**
 * @fileoverview Community-related database queries.
 */

/** @const {Object<string, string>} */
const COMMUNITY_QUERIES = {
  CREATE: `
    INSERT INTO communities 
    (name, description, icon, color, tags, creator_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  
  FIND_BY_NAME: `
    SELECT c.*, u.nickname as creator_username 
    FROM communities c 
    LEFT JOIN users u ON c.creator_id = u.id 
    WHERE LOWER(c.name) = LOWER(?)
  `,

  FIND_BY_ID: `
    SELECT c.*, u.nickname as creator_username 
    FROM communities c 
    LEFT JOIN users u ON c.creator_id = u.id 
    WHERE c.id = ?
  `,

  FIND_BY_NAME: `
    SELECT c.*, u.nickname as creator_username 
    FROM communities c 
    LEFT JOIN users u ON c.creator_id = u.id 
    WHERE LOWER(c.name) = LOWER(?)
  `,
  
  GET_USER_COMMUNITIES: `
    SELECT c.id, c.name, c.description, c.icon, c.color
    FROM community_memberships cm
    JOIN communities c ON cm.community_id = c.id
    WHERE cm.user_id = ?
  `
};

module.exports = COMMUNITY_QUERIES;