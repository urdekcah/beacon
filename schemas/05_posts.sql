CREATE TABLE `posts` (
  `id` BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `community_id` BIGINT NOT NULL,
  `author_id` INT NOT NULL,
  `title` VARCHAR(300) NOT NULL,
  `content` TEXT NOT NULL,
  `vote_count` INT DEFAULT 0,
  `comment_count` INT DEFAULT 0,
  `view_count` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_activity_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT `fk_post_community` 
    FOREIGN KEY (`community_id`) 
    REFERENCES `communities` (`id`) 
    ON DELETE CASCADE,
    
  CONSTRAINT `fk_post_author` 
    FOREIGN KEY (`author_id`) 
    REFERENCES `users` (`id`) 
    ON DELETE CASCADE,

  INDEX `idx_community_created` (`community_id`, `created_at`),
  INDEX `idx_author_created` (`author_id`, `created_at`),
  INDEX `idx_hot_posts` (`community_id`, `vote_count`, `created_at`),
  INDEX `idx_trending` (`community_id`, `last_activity_at`, `vote_count`),
  FULLTEXT INDEX `idx_post_search` (`title`, `content`)
);