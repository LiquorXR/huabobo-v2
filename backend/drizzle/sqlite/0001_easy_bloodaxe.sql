CREATE TABLE `print_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`work_id` text DEFAULT '' NOT NULL,
	`user_id` text DEFAULT '' NOT NULL,
	`contact` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `works` ADD `studio` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `works_status_published_idx` ON `works` (`status`,`published_at`);--> statement-breakpoint
ALTER TABLE `studio_models` ADD `category_ids` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
CREATE INDEX `studio_models_enabled_idx` ON `studio_models` (`enabled`);