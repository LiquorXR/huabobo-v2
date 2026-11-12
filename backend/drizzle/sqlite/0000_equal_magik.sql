CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`nickname` text DEFAULT '新用户' NOT NULL,
	`handle` text DEFAULT '' NOT NULL,
	`avatar` text DEFAULT 'images/author-user-me.jpg' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`type` text DEFAULT 'member' NOT NULL,
	`join_date` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `works` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`tag` text DEFAULT '' NOT NULL,
	`desc` text DEFAULT '' NOT NULL,
	`published_at` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`work_type` text DEFAULT 'model' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`work_id` text NOT NULL,
	`user_id` text NOT NULL,
	`text` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `likes` (
	`id` text PRIMARY KEY NOT NULL,
	`work_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `likes_work_user_unique` ON `likes` (`work_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `news` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`published_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `artisans` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`portfolio` text DEFAULT '[]' NOT NULL,
	`contact` text DEFAULT '{}' NOT NULL,
	`wechat` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `studio_models` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`desc` text DEFAULT '' NOT NULL,
	`glb_url` text NOT NULL,
	`thumbnail` text DEFAULT '' NOT NULL,
	`category_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `studio_model_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `studio_model_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `studio_model_categories_name_unique` ON `studio_model_categories` (`name`);--> statement-breakpoint
CREATE TABLE `about_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`hero_title` text DEFAULT '关于我们' NOT NULL,
	`hero_subtitle` text DEFAULT '' NOT NULL,
	`intro_title` text DEFAULT '平台简介' NOT NULL,
	`intro_text` text DEFAULT '' NOT NULL,
	`intro_image` text DEFAULT '' NOT NULL,
	`values` text DEFAULT '[]' NOT NULL,
	`print_section_title` text DEFAULT '可打印作品展示' NOT NULL,
	`print_section_desc` text DEFAULT '' NOT NULL,
	`print_works` text DEFAULT '[]' NOT NULL,
	`join_title` text DEFAULT '加入我们' NOT NULL,
	`join_text` text DEFAULT '' NOT NULL,
	`contact` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `about_pages_key_unique` ON `about_pages` (`key`);