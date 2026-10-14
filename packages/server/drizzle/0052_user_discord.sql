-- The Discord account linked for the server roles. Written by hand like 0038+.
ALTER TABLE `user` ADD COLUMN `discord_id` varchar(32);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_discord_id_unique` ON `user` (`discord_id`);
