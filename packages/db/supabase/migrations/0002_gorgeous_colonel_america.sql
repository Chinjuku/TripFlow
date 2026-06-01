ALTER TABLE "trips" ALTER COLUMN "is_debt_optimized" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "destination_name" text;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "center_lat" double precision;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "center_lng" double precision;