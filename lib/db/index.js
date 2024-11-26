/**
 * @fileoverview Database library entry point.
 */

const DatabaseConnection = require('./connection');
const UserRepository = require('./repositories/user');
const CommunityRepository = require('./repositories/community');
const PostRepository = require('./repositories/post');
const VoteRepository = require('./repositories/vote');

module.exports = {
  DatabaseConnection,
  UserRepository,
  CommunityRepository,
  PostRepository,
  VoteRepository
};