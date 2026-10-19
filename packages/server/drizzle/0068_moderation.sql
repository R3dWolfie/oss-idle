-- The team's groups and the account history (silences, restrictions). Written by hand like 0038+.
CREATE TABLE `user_group` (
	`user_id` int NOT NULL,
	`group` enum('admin','gmt') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_group_user_id_group_pk` PRIMARY KEY(`user_id`,`group`)
);
--> statement-breakpoint
ALTER TABLE `user_group` ADD CONSTRAINT `user_group_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE `user_account_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`action` enum('silence','restriction') NOT NULL,
	`reason` varchar(255) NOT NULL,
	`seconds` int NOT NULL DEFAULT 0,
	`actor_id` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_account_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_account_history_user_idx` ON `user_account_history` (`user_id`,`created_at`);
--> statement-breakpoint
ALTER TABLE `user_account_history` ADD CONSTRAINT `user_account_history_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- the restrictions so far, with their reasons
INSERT INTO `user_account_history` (`user_id`, `action`, `reason`, `created_at`)
SELECT `id`, 'restriction', COALESCE(`restricted_reason`, ''), `restricted_at` FROM `user` WHERE `restricted_at` IS NOT NULL;
