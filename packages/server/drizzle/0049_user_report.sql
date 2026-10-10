-- Reports from a player's profile, read in the admin chat console. By hand like 0038-0048.
CREATE TABLE `user_report` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`target_id` int NOT NULL,
	`reason` enum('cheating','multiple_accounts','chat','content','other') NOT NULL,
	`comment` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`resolved_at` timestamp,
	`resolved_by` int,
	CONSTRAINT `user_report_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user_report` ADD CONSTRAINT `user_report_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `user_report` ADD CONSTRAINT `user_report_target_id_user_id_fk` FOREIGN KEY (`target_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;
