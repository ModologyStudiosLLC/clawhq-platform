CREATE TABLE "experiment_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"goal" text NOT NULL,
	"eval_command" text NOT NULL,
	"eval_kind" text DEFAULT 'shell' NOT NULL,
	"scope" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"convergence_policy" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"best_score" real,
	"current_score" real,
	"experiments_run" integer DEFAULT 0 NOT NULL,
	"experiments_without_improvement" integer DEFAULT 0 NOT NULL,
	"spent_cents" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_by_agent_id" uuid,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"experiment_number" integer NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"score_before" real,
	"score_after" real,
	"eval_output" text,
	"diff_patch" text,
	"notes" text,
	"heartbeat_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "experiment_sessions" ADD CONSTRAINT "experiment_sessions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_sessions" ADD CONSTRAINT "experiment_sessions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_sessions" ADD CONSTRAINT "experiment_sessions_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_runs" ADD CONSTRAINT "experiment_runs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_runs" ADD CONSTRAINT "experiment_runs_session_id_experiment_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."experiment_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_runs" ADD CONSTRAINT "experiment_runs_heartbeat_run_id_heartbeat_runs_id_fk" FOREIGN KEY ("heartbeat_run_id") REFERENCES "public"."heartbeat_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "experiment_sessions_company_status_idx" ON "experiment_sessions" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "experiment_sessions_company_agent_idx" ON "experiment_sessions" USING btree ("company_id","agent_id");--> statement-breakpoint
CREATE INDEX "experiment_runs_session_experiment_idx" ON "experiment_runs" USING btree ("company_id","session_id","experiment_number");
