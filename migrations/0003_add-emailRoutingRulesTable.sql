CREATE TABLE `email_routing_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`emailAddress` text NOT NULL,
	`ruleId` text NOT NULL
);
