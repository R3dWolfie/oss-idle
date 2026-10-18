-- Restricted accounts (chargebacks, cheating). Written by hand like 0038+.
ALTER TABLE `user` ADD COLUMN `restricted_at` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `user` ADD COLUMN `restricted_reason` varchar(255);
