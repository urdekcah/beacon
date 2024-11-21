SET GLOBAL log_bin_trust_function_creators = 1;

CREATE TRIGGER update_community_member_count_after_insert 
AFTER INSERT ON community_memberships
FOR EACH ROW 
UPDATE communities
SET member_count = member_count + 1
WHERE id = NEW.community_id;

CREATE TRIGGER update_community_member_count_after_delete 
AFTER DELETE ON community_memberships
FOR EACH ROW 
UPDATE communities
SET member_count = member_count - 1
WHERE id = OLD.community_id;