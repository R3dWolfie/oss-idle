-- The approved release players get, kept apart from the author's edits under review. By hand like 0038+.
ALTER TABLE `addons` ADD `published_source` longtext;
--> statement-breakpoint
ALTER TABLE `addons` ADD `published_version` varchar(20);
--> statement-breakpoint
ALTER TABLE `addons` ADD `published_game_version` varchar(20);
--> statement-breakpoint
UPDATE `addons` SET `published_source` = `source`, `published_version` = `version`, `published_game_version` = `game_version` WHERE `status` = 'published';
