-- Add-ons are no longer reviewed: authors publish them, and their edits are live as saved. By hand like 0038+.
-- A denied update goes back to the release players had; anything else waiting on a review goes live.
UPDATE `addons` SET `updated_at` = `updated_at`, `source` = `published_source`, `version` = `published_version`, `game_version` = `published_game_version`, `commit` = `published_commit`, `tag` = `published_tag`, `status` = 'published' WHERE `status` = 'denied' AND `published_source` IS NOT NULL;
--> statement-breakpoint
UPDATE `addons` SET `updated_at` = `updated_at`, `status` = 'unpublished' WHERE `status` = 'denied' OR (`status` IN ('pending', 'onHold') AND `kind` = 'repo' AND `commit` IS NULL);
--> statement-breakpoint
UPDATE `addons` SET `updated_at` = `updated_at`, `status` = 'published', `published_at` = COALESCE(`published_at`, NOW()) WHERE `status` IN ('pending', 'onHold');
--> statement-breakpoint
ALTER TABLE `addons` DROP COLUMN `reviewed_source`, DROP COLUMN `published_source`, DROP COLUMN `published_version`, DROP COLUMN `published_game_version`, DROP COLUMN `feedback`, DROP COLUMN `trusted`, DROP COLUMN `published_commit`, DROP COLUMN `published_tag`, DROP COLUMN `source_diff`;
