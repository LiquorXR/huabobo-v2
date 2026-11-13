CREATE TABLE "print_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"work_id" text DEFAULT '' NOT NULL,
	"user_id" text DEFAULT '' NOT NULL,
	"contact" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "works" ADD COLUMN "studio" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "studio_models" ADD COLUMN "category_ids" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
CREATE INDEX "works_status_published_idx" ON "works" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "studio_models_enabled_idx" ON "studio_models" USING btree ("enabled");