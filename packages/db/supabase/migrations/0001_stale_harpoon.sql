ALTER TABLE "trips" ADD COLUMN "is_debt_optimized" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_payment_details" ADD COLUMN "is_show_mobile_banking" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_payment_details" ADD COLUMN "is_show_promptpay" boolean DEFAULT true NOT NULL;