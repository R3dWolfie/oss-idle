-- The best value each character ever reached on a medal line, and where it is now. Written by hand like 0038+.
CREATE TABLE `character_progress` (
	`character_id` int NOT NULL,
	`line` varchar(16) NOT NULL,
	`value` double NOT NULL,
	`current` double NOT NULL DEFAULT 0,
	CONSTRAINT `character_progress_pk` PRIMARY KEY(`character_id`,`line`),
	CONSTRAINT `character_progress_character_fk` FOREIGN KEY (`character_id`) REFERENCES `character`(`id`) ON DELETE cascade
);
