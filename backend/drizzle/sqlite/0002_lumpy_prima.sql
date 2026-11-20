CREATE TABLE `digital_humans` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`gender` text DEFAULT 'female' NOT NULL,
	`glb_url` text NOT NULL,
	`thumbnail` text DEFAULT '' NOT NULL,
	`background_type` text DEFAULT 'color' NOT NULL,
	`background_color` text DEFAULT '#f3ebe0' NOT NULL,
	`background_image` text DEFAULT '' NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`rig_info` text DEFAULT '{}' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `digital_humans_enabled_idx` ON `digital_humans` (`enabled`);
--> statement-breakpoint
CREATE UNIQUE INDEX `digital_humans_single_enabled` ON `digital_humans` (`enabled`) WHERE `enabled` = 1;