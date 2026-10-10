-- Private messages are never stored: only who blocks whom, and whether a player
-- takes messages from anyone or only from the people they added. By hand like 0038-0047.
CREATE TABLE `user_block` (
	`user_id` int NOT NULL,
	`target_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_block_user_id_target_id_pk` PRIMARY KEY(`user_id`,`target_id`)
);
--> statement-breakpoint
ALTER TABLE `user_block` ADD CONSTRAINT `user_block_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `user_block` ADD CONSTRAINT `user_block_target_id_user_id_fk` FOREIGN KEY (`target_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `user` ADD COLUMN `pm_from_anyone` boolean NOT NULL DEFAULT true;
