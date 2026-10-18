-- Pro-rata refunds of supporter tags. Written by hand like 0038+.
ALTER TABLE `supporter_order` ADD COLUMN `payment_intent` varchar(255);
--> statement-breakpoint
ALTER TABLE `supporter_order` ADD COLUMN `starts_at` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `supporter_order` ADD COLUMN `ends_at` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `supporter_order` ADD COLUMN `refunded` int NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE UNIQUE INDEX `supporter_order_payment_intent_unique` ON `supporter_order` (`payment_intent`);
