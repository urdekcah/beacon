CREATE TABLE `communities` (
  `id` BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(21) NOT NULL UNIQUE,
  `description` TEXT NOT NULL,
  `icon` VARCHAR(255) NOT NULL,
  `color` VARCHAR(7) NOT NULL,
  `visibility` ENUM('public', 'private', 'restricted') DEFAULT 'public',
  `tags` JSON,
  `member_count` INT DEFAULT 0,
  `post_count` INT DEFAULT 0,
  `creator_id` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_verified` BOOLEAN DEFAULT FALSE,
  
  CONSTRAINT `fk_community_creator` 
    FOREIGN KEY (`creator_id`) 
    REFERENCES `users` (`id`) 
    ON DELETE RESTRICT,
  
  INDEX `idx_creator` (`creator_id`),
  INDEX `idx_visibility` (`visibility`)
);