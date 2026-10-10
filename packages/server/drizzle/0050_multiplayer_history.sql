-- Multiplayer match history. By hand like 0038-0049.
CREATE TABLE `mp_match` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`is_public` boolean NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now(3)),
	`ended_at` timestamp(3),
	CONSTRAINT `mp_match_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mp_game` (
	`id` int AUTO_INCREMENT NOT NULL,
	`match_id` int NOT NULL,
	`beatmap_id` int NOT NULL,
	`started_at` timestamp(3) NOT NULL DEFAULT (now(3)),
	`ended_at` timestamp(3),
	CONSTRAINT `mp_game_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mp_game_score` (
	`game_id` int NOT NULL,
	`character_id` int NOT NULL,
	`score` int NOT NULL,
	`max_combo` int NOT NULL,
	`accuracy` decimal(10,8) NOT NULL,
	`failed` boolean NOT NULL,
	CONSTRAINT `mp_game_score_game_id_character_id_pk` PRIMARY KEY(`game_id`,`character_id`)
);
--> statement-breakpoint
CREATE TABLE `mp_event` (
	`id` int AUTO_INCREMENT NOT NULL,
	`match_id` int NOT NULL,
	`type` enum('create','join','leave','kick','host','game','close') NOT NULL,
	`character_id` int,
	`game_id` int,
	`at` timestamp(3) NOT NULL DEFAULT (now(3)),
	CONSTRAINT `mp_event_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `mp_game` ADD CONSTRAINT `mp_game_match_id_mp_match_id_fk` FOREIGN KEY (`match_id`) REFERENCES `mp_match`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `mp_game_score` ADD CONSTRAINT `mp_game_score_game_id_mp_game_id_fk` FOREIGN KEY (`game_id`) REFERENCES `mp_game`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `mp_event` ADD CONSTRAINT `mp_event_match_id_mp_match_id_fk` FOREIGN KEY (`match_id`) REFERENCES `mp_match`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `mp_event_match_idx` ON `mp_event` (`match_id`,`at`);
