ALTER TABLE "expenses" ADD COLUMN "is_central_fund" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "is_central_fund" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "treasurer_id" uuid;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "central_fund_per_person" double precision;