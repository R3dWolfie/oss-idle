-- A play's playback rate (x0.5..x1.5) and the stars it had at that rate. By hand like 0038+.
ALTER TABLE `score` ADD `rate` decimal(3,2) NOT NULL DEFAULT '1.00';
--> statement-breakpoint
ALTER TABLE `score` ADD `sr` decimal(10,3);
--> statement-breakpoint
ALTER TABLE `best` ADD `rate` decimal(3,2) NOT NULL DEFAULT '1.00';
--> statement-breakpoint
ALTER TABLE `best` ADD `sr` decimal(10,3);
--> statement-breakpoint
ALTER TABLE `best_pp` ADD `rate` decimal(3,2) NOT NULL DEFAULT '1.00';
--> statement-breakpoint
ALTER TABLE `best_pp` ADD `sr` decimal(10,3);
