-- first_place is built from the same columns as best, but 0062 left it out. By hand like 0038+.
ALTER TABLE `first_place` ADD `rate` decimal(3,2) NOT NULL DEFAULT '1.00';
--> statement-breakpoint
ALTER TABLE `first_place` ADD `sr` decimal(10,3);
--> statement-breakpoint
UPDATE `first_place` JOIN `score` ON `score`.`id` = `first_place`.`id` SET `first_place`.`rate` = `score`.`rate`, `first_place`.`sr` = `score`.`sr`;
