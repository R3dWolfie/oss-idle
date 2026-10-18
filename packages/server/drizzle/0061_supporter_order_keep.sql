-- A deleted account keeps its payment records (10 years, French accounting law). By hand like 0038+.
ALTER TABLE `supporter_order` DROP FOREIGN KEY `supporter_order_buyer_id_user_id_fk`;
--> statement-breakpoint
ALTER TABLE `supporter_order` DROP FOREIGN KEY `supporter_order_recipient_id_user_id_fk`;
--> statement-breakpoint
ALTER TABLE `supporter_order` MODIFY `buyer_id` int NULL;
--> statement-breakpoint
ALTER TABLE `supporter_order` MODIFY `recipient_id` int NULL;
--> statement-breakpoint
ALTER TABLE `supporter_order` ADD CONSTRAINT `supporter_order_buyer_id_user_id_fk` FOREIGN KEY (`buyer_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `supporter_order` ADD CONSTRAINT `supporter_order_recipient_id_user_id_fk` FOREIGN KEY (`recipient_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
