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

  IS_MEMBER: `
    SELECT * 
    FROM community_memberships 
    WHERE community_id = ? AND user_id = ?
  `,

  FIND_BY_COMMUNITY: `
    SELECT p.*, u.nickname as author_username
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    WHERE p.community_id = ?
    ORDER BY p.created_at DESC
  `,
  
  GET_USER_COMMUNITIES: `
    SELECT c.id, c.name, c.description, c.icon, c.color
    FROM community_memberships cm
    JOIN communities c ON cm.community_id = c.id
    WHERE cm.user_id = ?
  `,

  ADD_MEMBER: `
    INSERT INTO community_memberships (community_id, user_id)
    VALUES (?, ?)
  `,
};

module.exports = COMMUNITY_QUERIES;