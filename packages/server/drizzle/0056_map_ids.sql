-- Map ids are ours: osu!'s ids move to their own columns. Existing maps keep their id
-- (it was their osu! id), new ones count from 1e9 so they never read as an osu! id.
-- Written by hand like 0038+.
DELETE FROM `beatmap_claim` WHERE `set_id` <= 0;
--> statement-breakpoint
DELETE FROM `beatmapset` WHERE `id` <= 0 AND NOT EXISTS (SELECT 1 FROM `beatmap` WHERE `beatmap`.`set_id` = `beatmapset`.`id`);
--> statement-breakpoint
ALTER TABLE `beatmapset` ADD `osu_id` int;
--> statement-breakpoint
UPDATE `beatmapset` SET `osu_id` = `id` WHERE `id` > 0;
--> statement-breakpoint
ALTER TABLE `beatmapset` ADD CONSTRAINT `beatmapset_osu_id_unique` UNIQUE(`osu_id`);
--> statement-breakpoint
ALTER TABLE `beatmapset` MODIFY COLUMN `id` int AUTO_INCREMENT NOT NULL;
--> statement-breakpoint
ALTER TABLE `beatmapset` AUTO_INCREMENT = 1000000000;
--> statement-breakpoint
ALTER TABLE `beatmap` ADD `osu_id` int;
--> statement-breakpoint
ALTER TABLE `beatmap` ADD `file` text;
--> statement-breakpoint
UPDATE `beatmap` SET `osu_id` = `id` WHERE `id` > 0;
--> statement-breakpoint
ALTER TABLE `beatmap` ADD CONSTRAINT `beatmap_osu_id_unique` UNIQUE(`osu_id`);
--> statement-breakpoint
SET FOREIGN_KEY_CHECKS = 0;
--> statement-breakpoint
ALTER TABLE `beatmap` MODIFY COLUMN `id` int AUTO_INCREMENT NOT NULL;
--> statement-breakpoint
SET FOREIGN_KEY_CHECKS = 1;
--> statement-breakpoint
ALTER TABLE `beatmap` AUTO_INCREMENT = 1000000000;
