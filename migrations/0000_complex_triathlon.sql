CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY NOT NULL,
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
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
