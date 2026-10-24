-- Sets are no longer bundled by default; the ones not categorized yet follow. By hand like 0038+.
ALTER TABLE `beatmapset` ALTER COLUMN `bundled` SET DEFAULT false;
--> statement-breakpoint
UPDATE `beatmapset` SET `bundled` = false WHERE `categorized` = false;
