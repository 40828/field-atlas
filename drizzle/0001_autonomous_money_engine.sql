CREATE TABLE "engine_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"mission_id" uuid,
	"task_id" uuid,
	"scope" text NOT NULL,
	"title" text NOT NULL,
	"detail" text NOT NULL,
	"cost_cents" bigint DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engine_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"target" text,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engine_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"plan" text DEFAULT 'free' NOT NULL,
	"subscription_status" text,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"payment_failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "engine_accounts_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "engine_permissions" (
	"account_id" text PRIMARY KEY NOT NULL,
	"scopes" jsonb DEFAULT '["research"]'::jsonb NOT NULL,
	"spend_limit_cents" bigint DEFAULT 0 NOT NULL,
	"zero_capital_mode" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engine_stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engine_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"mission_id" uuid,
	"task_id" uuid,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"title" text NOT NULL,
	"what" text NOT NULL,
	"why" text NOT NULL,
	"expected" text NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"next" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engine_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"mission_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"query" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"snippet" text NOT NULL,
	"published_at" text,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engine_experiments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"mission_id" uuid NOT NULL,
	"strategy_id" uuid,
	"title" text NOT NULL,
	"hypothesis" text NOT NULL,
	"success_criteria" text NOT NULL,
	"plan" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"result" text,
	"spec" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engine_improvements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"project_id" uuid,
	"observation" text NOT NULL,
	"hypothesis" text NOT NULL,
	"success_criterion" text NOT NULL,
	"proposal" text NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"baseline" jsonb,
	"result" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engine_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"mission_id" uuid,
	"kind" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"description" text NOT NULL,
	"source" text NOT NULL,
	"source_ref" text NOT NULL,
	"verification" text DEFAULT 'unverified' NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engine_marketing_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"mission_id" uuid,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"metrics" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engine_missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"created_by" text NOT NULL,
	"title" text NOT NULL,
	"objective" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"target_cents" bigint NOT NULL,
	"timeframe_days" integer,
	"starting_capital_cents" bigint DEFAULT 0 NOT NULL,
	"max_spend_cents" bigint DEFAULT 0 NOT NULL,
	"skills" text DEFAULT '' NOT NULL,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_tolerance" text DEFAULT 'medium' NOT NULL,
	"constraints" text DEFAULT '' NOT NULL,
	"zero_capital" boolean DEFAULT true NOT NULL,
	"blocked_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "engine_opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"mission_id" uuid NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"data" jsonb NOT NULL,
	"researched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engine_outreach" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"prospect_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"reply_class" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engine_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"mission_id" uuid,
	"experiment_id" uuid,
	"name" text NOT NULL,
	"spec" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"files" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"checks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sandbox_id" text,
	"preview_url" text,
	"deployment_url" text,
	"deployment_status" text,
	"deployment_verified_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engine_prospects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"mission_id" uuid,
	"company" text NOT NULL,
	"contact_name" text,
	"role" text,
	"email" text,
	"website" text,
	"notes" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"stage" text DEFAULT 'new' NOT NULL,
	"fit_score" integer,
	"follow_up_at" timestamp with time zone,
	"value_cents" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engine_strategies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"mission_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"rank" integer NOT NULL,
	"score" double precision NOT NULL,
	"expected_value_cents" bigint NOT NULL,
	"components" jsonb NOT NULL,
	"rationale" text NOT NULL,
	"status" text DEFAULT 'candidate' NOT NULL,
	"lessons" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engine_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"mission_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"objective" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"priority" integer DEFAULT 50 NOT NULL,
	"depends_on" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resource_estimate" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"input" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"output" jsonb,
	"verification" jsonb,
	"error" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"timeout_ms" integer DEFAULT 120000 NOT NULL,
	"next_run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_expires_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"next_action" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "engine_approvals" ADD CONSTRAINT "engine_approvals_mission_id_engine_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."engine_missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engine_events" ADD CONSTRAINT "engine_events_mission_id_engine_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."engine_missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engine_evidence" ADD CONSTRAINT "engine_evidence_mission_id_engine_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."engine_missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engine_experiments" ADD CONSTRAINT "engine_experiments_mission_id_engine_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."engine_missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engine_experiments" ADD CONSTRAINT "engine_experiments_strategy_id_engine_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."engine_strategies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engine_improvements" ADD CONSTRAINT "engine_improvements_project_id_engine_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."engine_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engine_ledger" ADD CONSTRAINT "engine_ledger_mission_id_engine_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."engine_missions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engine_marketing_assets" ADD CONSTRAINT "engine_marketing_assets_mission_id_engine_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."engine_missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engine_opportunities" ADD CONSTRAINT "engine_opportunities_mission_id_engine_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."engine_missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engine_outreach" ADD CONSTRAINT "engine_outreach_prospect_id_engine_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."engine_prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engine_projects" ADD CONSTRAINT "engine_projects_mission_id_engine_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."engine_missions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engine_projects" ADD CONSTRAINT "engine_projects_experiment_id_engine_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."engine_experiments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engine_prospects" ADD CONSTRAINT "engine_prospects_mission_id_engine_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."engine_missions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engine_strategies" ADD CONSTRAINT "engine_strategies_mission_id_engine_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."engine_missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engine_strategies" ADD CONSTRAINT "engine_strategies_opportunity_id_engine_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."engine_opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engine_tasks" ADD CONSTRAINT "engine_tasks_mission_id_engine_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."engine_missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "engine_approvals_account_idx" ON "engine_approvals" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "engine_audit_account_idx" ON "engine_audit_log" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "engine_events_account_idx" ON "engine_events" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "engine_events_mission_idx" ON "engine_events" USING btree ("mission_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "engine_evidence_url_idx" ON "engine_evidence" USING btree ("mission_id","url");--> statement-breakpoint
CREATE INDEX "engine_evidence_mission_idx" ON "engine_evidence" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "engine_experiments_mission_idx" ON "engine_experiments" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "engine_improvements_account_idx" ON "engine_improvements" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "engine_ledger_dedupe_idx" ON "engine_ledger" USING btree ("account_id","source","source_ref");--> statement-breakpoint
CREATE INDEX "engine_ledger_account_idx" ON "engine_ledger" USING btree ("account_id","occurred_at");--> statement-breakpoint
CREATE INDEX "engine_marketing_account_idx" ON "engine_marketing_assets" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "engine_missions_account_idx" ON "engine_missions" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "engine_opps_mission_idx" ON "engine_opportunities" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "engine_outreach_prospect_idx" ON "engine_outreach" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "engine_projects_account_idx" ON "engine_projects" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "engine_prospects_account_idx" ON "engine_prospects" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "engine_strategies_mission_idx" ON "engine_strategies" USING btree ("mission_id","rank");--> statement-breakpoint
CREATE UNIQUE INDEX "engine_tasks_idem_idx" ON "engine_tasks" USING btree ("mission_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "engine_tasks_runnable_idx" ON "engine_tasks" USING btree ("status","next_run_at");--> statement-breakpoint
CREATE INDEX "engine_tasks_mission_idx" ON "engine_tasks" USING btree ("mission_id");