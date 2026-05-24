import { db } from './drizzle';
import { sql } from 'drizzle-orm';

async function run() {
  console.log('Starting custom finance table migration...');

  const createTablesSql = `
    CREATE TABLE IF NOT EXISTS "expenses" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "trip_id" uuid NOT NULL REFERENCES "trips"("id") ON DELETE cascade,
      "description" text NOT NULL,
      "amount" double precision NOT NULL,
      "paid_by_id" uuid NOT NULL,
      "category" text DEFAULT 'other' NOT NULL,
      "split_method" text DEFAULT 'equally' NOT NULL,
      "receipt_url" text,
      "expense_date" timestamp with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "expense_splits" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "expense_id" uuid NOT NULL REFERENCES "expenses"("id") ON DELETE cascade,
      "user_id" uuid NOT NULL,
      "amount" double precision NOT NULL,
      "item_paid" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "settlements" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "trip_id" uuid NOT NULL REFERENCES "trips"("id") ON DELETE cascade,
      "payer_id" uuid NOT NULL,
      "payee_id" uuid NOT NULL,
      "amount" double precision NOT NULL,
      "status" text DEFAULT 'pending' NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "trip_budgets" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "trip_id" uuid NOT NULL REFERENCES "trips"("id") ON DELETE cascade,
      "amount" double precision NOT NULL,
      "category" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "user_payment_details" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL,
      "promptpay_id" text,
      "qr_code_url" text,
      "bank_name" text,
      "bank_account_number" text,
      "bank_account_name" text,
      "is_show_mobile_banking" boolean DEFAULT true NOT NULL,
      "is_show_promptpay" boolean DEFAULT true NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "user_payment_details" ADD COLUMN IF NOT EXISTS "is_show_mobile_banking" boolean DEFAULT true NOT NULL;
    ALTER TABLE "user_payment_details" ADD COLUMN IF NOT EXISTS "is_show_promptpay" boolean DEFAULT true NOT NULL;

    CREATE INDEX IF NOT EXISTS "expense_splits_expense_idx" ON "expense_splits" ("expense_id");
    CREATE INDEX IF NOT EXISTS "expense_splits_user_idx" ON "expense_splits" ("user_id");
    CREATE INDEX IF NOT EXISTS "expenses_trip_idx" ON "expenses" ("trip_id");
    CREATE INDEX IF NOT EXISTS "expenses_paid_by_idx" ON "expenses" ("paid_by_id");
    CREATE INDEX IF NOT EXISTS "settlements_trip_idx" ON "settlements" ("trip_id");
    CREATE INDEX IF NOT EXISTS "settlements_payer_idx" ON "settlements" ("payer_id");
    CREATE INDEX IF NOT EXISTS "settlements_payee_idx" ON "settlements" ("payee_id");
    CREATE INDEX IF NOT EXISTS "trip_budgets_trip_idx" ON "trip_budgets" ("trip_id");
    CREATE INDEX IF NOT EXISTS "user_payment_details_user_idx" ON "user_payment_details" ("user_id");
  `;

  try {
    await db.execute(sql.raw(createTablesSql));
    console.log('Finance tables and indexes created successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

run();
