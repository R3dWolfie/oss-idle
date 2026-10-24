-- Skins are osu! skins: their files, stored by hash. The old JSON skins go. By hand like 0038+.
DELETE FROM `skin`;
--> statement-breakpoint
ALTER TABLE `skin` DROP COLUMN `definition`, ADD `size` int DEFAULT 0 NOT NULL, ADD `file_count` int DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `skin_file` (
	`skin_id` int NOT NULL,
	`path` varchar(512) NOT NULL,
	`hash` char(64) NOT NULL,
	`size` int NOT NULL,
	CONSTRAINT `skin_file_skin_id_path_pk` PRIMARY KEY(`skin_id`,`path`)
);
--> statement-breakpoint
ALTER TABLE `skin_file` ADD CONSTRAINT `skin_file_skin_id_skin_id_fk` FOREIGN KEY (`skin_id`) REFERENCES `skin`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `skin_file_hash_idx` ON `skin_file` (`hash`);
