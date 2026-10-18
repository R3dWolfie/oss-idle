-- Supporter tags past 2038, which TIMESTAMP can't hold. Written by hand like 0038+.
ALTER TABLE `user` MODIFY `supporter_until` datetime;
--> statement-breakpoint
ALTER TABLE `supporter_order` MODIFY `starts_at` datetime NULL;
--> statement-breakpoint
ALTER TABLE `supporter_order` MODIFY `ends_at` datetime NULL;
