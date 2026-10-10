-- A match game's scores as osu! shows them: grade and every judgement. By hand like 0038-0050.
ALTER TABLE `mp_game_score` ADD `grade` enum('XX','X','SS','S','A','B','C','D','F') NOT NULL DEFAULT 'D';
--> statement-breakpoint
ALTER TABLE `mp_game_score` ADD `divine` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `mp_game_score` ADD `marvelous` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `mp_game_score` ADD `perfect` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `mp_game_score` ADD `great` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `mp_game_score` ADD `good` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `mp_game_score` ADD `bad` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `mp_game_score` ADD `miss` int NOT NULL DEFAULT 0;
