-- Supporter tags bought through Stripe. Written by hand like 0038+.
ALTER TABLE `user` ADD COLUMN `supporter_until` timestamp;
--> statement-breakpoint
ALTER TABLE `user` ADD COLUMN `supporter_months` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `user` ADD COLUMN `stripe_customer_id` varchar(255);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_stripe_customer_id_unique` ON `user` (`stripe_customer_id`);
--> statement-breakpoint
CREATE TABLE `supporter_order` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buyer_id` int NOT NULL,
	`recipient_id` int NOT NULL,
	`amount` int NOT NULL,
	`months` int NOT NULL,
	`recurring` boolean NOT NULL,
	`stripe_ref` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supporter_order_id` PRIMARY KEY(`id`),
	CONSTRAINT `supporter_order_stripe_ref_unique` UNIQUE(`stripe_ref`)
);
--> statement-breakpoint
ALTER TABLE `supporter_order` ADD CONSTRAINT `supporter_order_buyer_id_user_id_fk` FOREIGN KEY (`buyer_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `supporter_order` ADD CONSTRAINT `supporter_order_recipient_id_user_id_fk` FOREIGN KEY (`recipient_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;
