CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"password_hash" text NOT NULL,
	"nickname" text DEFAULT '新用户' NOT NULL,
	"handle" text DEFAULT '' NOT NULL,
	"avatar" text DEFAULT 'images/author-user-me.jpg' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'member' NOT NULL,
	"join_date" text DEFAULT '' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "works" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"tag" text DEFAULT '' NOT NULL,
	"desc" text DEFAULT '' NOT NULL,
	"published_at" bigint,
	"status" text DEFAULT 'draft' NOT NULL,
	"work_type" text DEFAULT 'model' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"work_id" text NOT NULL,
	"user_id" text NOT NULL,
	"text" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"id" text PRIMARY KEY NOT NULL,
	"work_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"published_at" bigint NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artisans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"tags" text DEFAULT '[]' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"portfolio" text DEFAULT '[]' NOT NULL,
	"contact" text DEFAULT '{}' NOT NULL,
	"wechat" text DEFAULT '{}' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studio_models" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"desc" text DEFAULT '' NOT NULL,
	"glb_url" text NOT NULL,
	"thumbnail" text DEFAULT '' NOT NULL,
	"category_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studio_model_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "studio_model_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "about_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"hero_title" text DEFAULT '关于我们' NOT NULL,
	"hero_subtitle" text DEFAULT '' NOT NULL,
	"intro_title" text DEFAULT '平台简介' NOT NULL,
	"intro_text" text DEFAULT '' NOT NULL,
	"intro_image" text DEFAULT '' NOT NULL,
	"values" text DEFAULT '[]' NOT NULL,
	"print_section_title" text DEFAULT '可打印作品展示' NOT NULL,
	"print_section_desc" text DEFAULT '' NOT NULL,
	"print_works" text DEFAULT '[]' NOT NULL,
	"join_title" text DEFAULT '加入我们' NOT NULL,
	"join_text" text DEFAULT '' NOT NULL,
	"contact" text DEFAULT '{}' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "about_pages_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_models" ADD CONSTRAINT "studio_models_category_id_studio_model_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."studio_model_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "likes_work_user_unique" ON "likes" USING btree ("work_id","user_id");