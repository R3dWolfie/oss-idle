-- Supporter profile perks: the me! page (osu! BBCode) and the order of the profile blocks. By hand like 0038+.
ALTER TABLE `character` ADD `user_page` mediumtext;
--> statement-breakpoint
ALTER TABLE `character` ADD `profile_order` json;
