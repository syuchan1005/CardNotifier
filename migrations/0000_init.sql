CREATE TABLE `emails` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`from` text NOT NULL,
	`to` text NOT NULL,
	`date` integer NOT NULL,
	`subject` text NOT NULL,
	`bodyText` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`endpoint` text NOT NULL,
	`keyP256dh` text NOT NULL,
	`keyAuth` text NOT NULL,
	`expirationTime` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`isRefund` integer NOT NULL,
	`amount` integer NOT NULL,
	`amountCurrency` text NOT NULL,
	`cardName` text NOT NULL,
	`purchasedAt` integer NOT NULL,
	`destination` text NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
