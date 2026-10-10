-- Lifetime upgrade counts, for the upgrade medals: prestige resets a skill's
-- upgrades, so the current columns forget what was bought before it. Seeded
-- from what each character holds now (history before a prestige is unknown).
-- Written by hand like 0038-0043.
ALTER TABLE `character` ADD COLUMN `upgrades_bought` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `character` ADD COLUMN `ladders_completed` int NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE `character` SET
	`upgrades_bought` = `accuracy_upgrades` + `speed_upgrades` + `stamina_upgrades` + `jackspeed_upgrades` + `coordination_upgrades` + `release_upgrades` + `reading_upgrades` + `consistency_upgrades` + `concentration_upgrades` + `speedjam_upgrades` + `memory_upgrades`,
	`ladders_completed` = (`accuracy_upgrades` >= 10 + `accuracy_prestige`) + (`speed_upgrades` >= 10 + `speed_prestige`) + (`stamina_upgrades` >= 10 + `stamina_prestige`) + (`jackspeed_upgrades` >= 10 + `jackspeed_prestige`) + (`coordination_upgrades` >= 10 + `coordination_prestige`) + (`release_upgrades` >= 10 + `release_prestige`) + (`reading_upgrades` >= 10 + `reading_prestige`) + (`consistency_upgrades` >= 10 + `consistency_prestige`) + (`concentration_upgrades` >= 10 + `concentration_prestige`) + (`speedjam_upgrades` >= 10 + `speedjam_prestige`) + (`memory_upgrades` >= 10 + `memory_prestige`);
