CREATE TABLE `community_memberships` (
  `id` BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `community_id` BIGINT NOT NULL,
  `user_id` INT NOT NULL,
  `joined_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `last_activity_at` DATETIME,
  
  UNIQUE KEY `unique_membership` (`community_id`, `user_id`),
  
  CONSTRAINT `fk_membership_community` 
    FOREIGN KEY (`community_id`) 
    REFERENCES `communities` (`id`) 
    ON DELETE CASCADE,
  
  CONSTRAINT `fk_membership_user` 
    FOREIGN KEY (`user_id`) 
    REFERENCES `users` (`id`) 
    ON DELETE CASCADE
);