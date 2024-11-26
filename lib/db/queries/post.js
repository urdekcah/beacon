/**
 * @fileoverview Post-related database queries.
 */

/** @const {Object<string, string>} */
const POST_QUERIES = {
  CREATE: `
    INSERT INTO posts 
    (title, content, community_id, author_id) 
    VALUES (?, ?, ?, ?)
  `,
  
  FIND_BY_COMMUNITY: `
    SELECT p.*, u.nickname as author_username
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    WHERE p.community_id = ?
    ORDER BY p.created_at DESC
  `,

  FIND_BY_ID: `
    SELECT p.*, u.nickname as author_username
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    WHERE p.id = ?
  `,
  
  GET_FEED_POSTS: `
    SELECT p.*, u.username as author_username, c.name as community_name
    FROM posts p
    JOIN users u ON p.author_id = u.id
    JOIN communities c ON p.community_id = c.id
    WHERE p.community_id IN (?)
    ORDER BY p.created_at DESC
  `
};

module.exports = POST_QUERIES;