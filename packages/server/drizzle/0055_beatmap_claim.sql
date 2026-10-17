-- Temporary: players claiming ranked maps they proposed on Discord. Written by hand like 0038+.
CREATE TABLE `beatmap_claim` (
	`set_id` int NOT NULL,
	`user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `beatmap_claim_set_id_user_id_pk` PRIMARY KEY(`set_id`,`user_id`)
);
