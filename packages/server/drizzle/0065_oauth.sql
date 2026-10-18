-- The public API: developers' OAuth apps and the tokens they were given. By hand like 0038+.
CREATE TABLE `oauth_client` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`secret` varchar(64) NOT NULL,
	`redirect` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oauth_client_id` PRIMARY KEY(`id`),
	CONSTRAINT `oauth_client_user_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `oauth_client_user_idx` ON `oauth_client` (`user_id`);
--> statement-breakpoint
CREATE TABLE `oauth_token` (
	`id` char(64) NOT NULL,
	`refresh` char(64),
	`client_id` int NOT NULL,
	`user_id` int,
	`scopes` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`refresh_expires_at` timestamp NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oauth_token_id` PRIMARY KEY(`id`),
	CONSTRAINT `oauth_token_refresh_unique` UNIQUE(`refresh`),
	CONSTRAINT `oauth_token_client_fk` FOREIGN KEY (`client_id`) REFERENCES `oauth_client`(`id`) ON DELETE cascade,
	CONSTRAINT `oauth_token_user_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `oauth_token_user_client_idx` ON `oauth_token` (`user_id`, `client_id`);
--> statement-breakpoint
CREATE INDEX `oauth_token_expires_idx` ON `oauth_token` (`expires_at`);
