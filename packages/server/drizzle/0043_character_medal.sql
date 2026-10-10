-- The medals each character holds (shared/src/achievements/catalogue.ts). Written
-- by hand like 0038-0042 - the drizzle snapshot stopped at 0037.
CREATE TABLE `character_medal` (
	`character_id` int NOT NULL,
	`medal_id` varchar(32) NOT NULL,
	`unlocked_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `character_medal_character_id_medal_id_pk` PRIMARY KEY(`character_id`,`medal_id`)
);
--> statement-breakpoint
ALTER TABLE `character_medal` ADD CONSTRAINT `character_medal_character_id_character_id_fk` FOREIGN KEY (`character_id`) REFERENCES `character`(`id`) ON DELETE cascade ON UPDATE no action;
