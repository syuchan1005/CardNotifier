CREATE TABLE `push_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`endpoint` text NOT NULL,
	`key_p256dh` text NOT NULL,
	`key_auth` text NOT NULL,
	`expirationTime` integer DEFAULT 0 NOT NULL
);
