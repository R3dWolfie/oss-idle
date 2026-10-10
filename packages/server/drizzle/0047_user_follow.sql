-- Friends: one row per account added by another. Written by hand like 0038-0046.
CREATE TABLE `user_follow` (
	`user_id` int NOT NULL,
	`target_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_follow_user_id_target_id_pk` PRIMARY KEY(`user_id`,`target_id`)
);
--> statement-breakpoint
CREATE INDEX `user_follow_target_idx` ON `user_follow` (`target_id`,`user_id`);
--> statement-breakpoint
ALTER TABLE `user_follow` ADD CONSTRAINT `user_follow_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `user_follow` ADD CONSTRAINT `user_follow_target_id_user_id_fk` FOREIGN KEY (`target_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `user` ADD COLUMN `last_active_at` timestamp;
