CREATE TABLE `votes` (
  `id` BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `post_id` BIGINT NOT NULL,
  `user_id` INT NOT NULL,
  `vote_type` TINYINT NOT NULL, -- 1: upvote, -1: downvote
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT `fk_vote_post` 
    FOREIGN KEY (`post_id`) 
    REFERENCES `posts` (`id`) 
    ON DELETE CASCADE,
    
  CONSTRAINT `fk_vote_user` 
    FOREIGN KEY (`user_id`) 
    REFERENCES `users` (`id`) 
    ON DELETE CASCADE,

  UNIQUE KEY `unique_user_vote` (`post_id`, `user_id`),
  INDEX `idx_user_votes` (`user_id`, `created_at`)
);