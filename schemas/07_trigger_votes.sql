SET GLOBAL log_bin_trust_function_creators = 1;

CREATE TRIGGER update_post_vote_count_after_vote_insert 
AFTER INSERT ON votes
FOR EACH ROW 
UPDATE posts
SET vote_count = vote_count + NEW.vote_type
WHERE id = NEW.post_id;

CREATE TRIGGER update_post_vote_count_after_vote_update 
AFTER UPDATE ON votes
FOR EACH ROW 
UPDATE posts
SET vote_count = vote_count - OLD.vote_type + NEW.vote_type
WHERE id = NEW.post_id;

CREATE TRIGGER update_post_vote_count_after_vote_delete 
AFTER DELETE ON votes
FOR EACH ROW 
UPDATE posts
SET vote_count = vote_count - OLD.vote_type
WHERE id = OLD.post_id;