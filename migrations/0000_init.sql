CREATE TABLE `emails` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from` text NOT NULL,
	`to` text NOT NULL,
	`date` integer NOT NULL,
	`subject` text NOT NULL,
	`bodyText` text NOT NULL,
	`rawText` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`amount` integer NOT NULL,
	`amount_currency` text NOT NULL,
	`card_name` text NOT NULL,
	`created_at` integer NOT NULL,
	`purchased_at` integer NOT NULL,
	`dest` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
