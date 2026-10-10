ALTER TABLE "engine_projects" ADD COLUMN "listed_in_catalog" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE "engine_favorites" (
	"account_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "engine_favorites_account_id_project_id_pk" PRIMARY KEY("account_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "engine_businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"name" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"asking_cents" bigint,
	"listed" boolean DEFAULT false NOT NULL,
	"assumptions" text DEFAULT '' NOT NULL,
	"financial_notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "engine_favorites" ADD CONSTRAINT "engine_favorites_project_id_engine_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."engine_projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "engine_businesses_account_idx" ON "engine_businesses" USING btree ("account_id","created_at");
