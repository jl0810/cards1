CREATE SCHEMA "cardsgonecrazy";
--> statement-breakpoint
CREATE TYPE "cardsgonecrazy"."alert_type" AS ENUM('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'MAINTENANCE', 'FEATURE', 'BILLING', 'SECURITY');--> statement-breakpoint
CREATE TYPE "cardsgonecrazy"."benefit_type" AS ENUM('STATEMENT_CREDIT', 'EXTERNAL_CREDIT', 'INSURANCE', 'PERK');--> statement-breakpoint
CREATE TYPE "cardsgonecrazy"."priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TABLE "cardsgonecrazy"."account_extended" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plaid_account_id" uuid NOT NULL,
	"card_product_id" uuid,
	"nickname" text,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"sort_order" integer,
	"color" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"date_opened" timestamp,
	"payment_marked_paid_date" timestamp,
	"payment_marked_paid_amount" double precision,
	"payment_cycle_status" text,
	CONSTRAINT "account_extended_plaid_account_id_unique" UNIQUE("plaid_account_id")
);
--> statement-breakpoint
CREATE TABLE "cardsgonecrazy"."banks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plaid_id" text NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"logo_svg" text,
	"brand_color" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "banks_plaid_id_unique" UNIQUE("plaid_id")
);
--> statement-breakpoint
CREATE TABLE "cardsgonecrazy"."benefit_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_benefit_id" uuid NOT NULL,
	"plaid_account_id" uuid NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"max_amount" double precision NOT NULL,
	"used_amount" double precision DEFAULT 0 NOT NULL,
	"remaining_amount" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cardsgonecrazy"."card_benefits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_product_id" uuid NOT NULL,
	"benefit_name" text NOT NULL,
	"timing" text NOT NULL,
	"max_amount" double precision,
	"keywords" text[],
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"type" "cardsgonecrazy"."benefit_type" DEFAULT 'STATEMENT_CREDIT' NOT NULL,
	"is_approved" boolean DEFAULT true NOT NULL,
	"change_notes" text,
	"rule_config" json
);
--> statement-breakpoint
CREATE TABLE "cardsgonecrazy"."card_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issuer" text NOT NULL,
	"product_name" text NOT NULL,
	"card_type" text,
	"annual_fee" double precision,
	"signup_bonus" text,
	"image_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"bank_id" uuid
);
--> statement-breakpoint
CREATE TABLE "cardsgonecrazy"."family_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"avatar" text,
	"color" text,
	"role" text DEFAULT 'Member',
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cardsgonecrazy"."plaid_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plaid_item_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"name" text NOT NULL,
	"mask" text,
	"type" text,
	"subtype" text,
	"current_balance" double precision,
	"available_balance" double precision,
	"limit" double precision,
	"iso_currency_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"apr" double precision,
	"last_statement_balance" double precision,
	"last_statement_issue_date" timestamp,
	"min_payment_amount" double precision,
	"next_payment_due_date" timestamp,
	"apr_balance_subject_to_apr" double precision,
	"apr_interest_charge_amount" double precision,
	"apr_type" text,
	"is_overdue" boolean,
	"last_payment_amount" double precision,
	"last_payment_date" timestamp,
	"family_member_id" uuid NOT NULL,
	"official_name" text,
	"status" text DEFAULT 'active' NOT NULL,
	CONSTRAINT "plaid_accounts_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
CREATE TABLE "cardsgonecrazy"."plaid_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_id" text NOT NULL,
	"institution_id" text,
	"institution_name" text,
	"status" text DEFAULT 'active' NOT NULL,
	"is_test" boolean DEFAULT false NOT NULL,
	"next_cursor" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"access_token_id" text NOT NULL,
	"family_member_id" uuid NOT NULL,
	"last_synced_at" timestamp,
	"bank_id" uuid,
	CONSTRAINT "plaid_items_item_id_unique" UNIQUE("item_id"),
	CONSTRAINT "plaid_items_access_token_id_unique" UNIQUE("access_token_id")
);
--> statement-breakpoint
CREATE TABLE "cardsgonecrazy"."plaid_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plaid_item_id" uuid NOT NULL,
	"transaction_id" text NOT NULL,
	"account_id" text NOT NULL,
	"amount" double precision NOT NULL,
	"date" timestamp NOT NULL,
	"name" text NOT NULL,
	"merchant_name" text,
	"category" text[],
	"pending" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"original_description" text,
	"payment_channel" text,
	"personal_finance_category_detailed" text,
	"personal_finance_category_primary" text,
	"transaction_code" text,
	CONSTRAINT "plaid_transactions_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "cardsgonecrazy"."transaction_extended" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plaid_transaction_id" uuid NOT NULL,
	"matched_benefit_id" uuid,
	"benefit_usage_id" uuid,
	"covered_amount" double precision,
	"custom_category" text,
	"notes" text,
	"tags" text[],
	"is_excluded_from_budget" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_extended_plaid_transaction_id_unique" UNIQUE("plaid_transaction_id")
);
--> statement-breakpoint
CREATE TABLE "cardsgonecrazy"."user_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" "cardsgonecrazy"."alert_type" DEFAULT 'INFO' NOT NULL,
	"priority" "cardsgonecrazy"."priority" DEFAULT 'MEDIUM' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp,
	"action_url" text,
	"action_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cardsgonecrazy"."user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supabase_id" text NOT NULL,
	"name" text,
	"avatar" text,
	"bio" text,
	"website" text,
	"location" text,
	"theme" text DEFAULT 'system' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"push_notifications" boolean DEFAULT false NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"analytics_sharing" boolean DEFAULT true NOT NULL,
	"auto_save" boolean DEFAULT true NOT NULL,
	"beta_features" boolean DEFAULT false NOT NULL,
	"compact_mode" boolean DEFAULT false NOT NULL,
	"crash_reporting" boolean DEFAULT true NOT NULL,
	"default_dashboard" text DEFAULT 'main' NOT NULL,
	"keyboard_shortcuts" boolean DEFAULT true NOT NULL,
	"marketing_emails" boolean DEFAULT false NOT NULL,
	"sidebar_collapsed" boolean DEFAULT false NOT NULL,
	"sound_effects" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_profiles_supabase_id_unique" UNIQUE("supabase_id")
);
--> statement-breakpoint
ALTER TABLE "cardsgonecrazy"."account_extended" ADD CONSTRAINT "account_extended_plaid_account_id_plaid_accounts_id_fk" FOREIGN KEY ("plaid_account_id") REFERENCES "cardsgonecrazy"."plaid_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardsgonecrazy"."account_extended" ADD CONSTRAINT "account_extended_card_product_id_card_products_id_fk" FOREIGN KEY ("card_product_id") REFERENCES "cardsgonecrazy"."card_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardsgonecrazy"."benefit_usage" ADD CONSTRAINT "benefit_usage_card_benefit_id_card_benefits_id_fk" FOREIGN KEY ("card_benefit_id") REFERENCES "cardsgonecrazy"."card_benefits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardsgonecrazy"."benefit_usage" ADD CONSTRAINT "benefit_usage_plaid_account_id_plaid_accounts_id_fk" FOREIGN KEY ("plaid_account_id") REFERENCES "cardsgonecrazy"."plaid_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardsgonecrazy"."card_benefits" ADD CONSTRAINT "card_benefits_card_product_id_card_products_id_fk" FOREIGN KEY ("card_product_id") REFERENCES "cardsgonecrazy"."card_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardsgonecrazy"."card_products" ADD CONSTRAINT "card_products_bank_id_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "cardsgonecrazy"."banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardsgonecrazy"."family_members" ADD CONSTRAINT "family_members_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "cardsgonecrazy"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardsgonecrazy"."plaid_accounts" ADD CONSTRAINT "plaid_accounts_plaid_item_id_plaid_items_id_fk" FOREIGN KEY ("plaid_item_id") REFERENCES "cardsgonecrazy"."plaid_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardsgonecrazy"."plaid_accounts" ADD CONSTRAINT "plaid_accounts_family_member_id_family_members_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "cardsgonecrazy"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardsgonecrazy"."plaid_items" ADD CONSTRAINT "plaid_items_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "cardsgonecrazy"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardsgonecrazy"."plaid_items" ADD CONSTRAINT "plaid_items_family_member_id_family_members_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "cardsgonecrazy"."family_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardsgonecrazy"."plaid_items" ADD CONSTRAINT "plaid_items_bank_id_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "cardsgonecrazy"."banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardsgonecrazy"."plaid_transactions" ADD CONSTRAINT "plaid_transactions_plaid_item_id_plaid_items_id_fk" FOREIGN KEY ("plaid_item_id") REFERENCES "cardsgonecrazy"."plaid_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardsgonecrazy"."plaid_transactions" ADD CONSTRAINT "plaid_transactions_account_id_plaid_accounts_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "cardsgonecrazy"."plaid_accounts"("account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardsgonecrazy"."transaction_extended" ADD CONSTRAINT "transaction_extended_plaid_transaction_id_plaid_transactions_id_fk" FOREIGN KEY ("plaid_transaction_id") REFERENCES "cardsgonecrazy"."plaid_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardsgonecrazy"."transaction_extended" ADD CONSTRAINT "transaction_extended_matched_benefit_id_card_benefits_id_fk" FOREIGN KEY ("matched_benefit_id") REFERENCES "cardsgonecrazy"."card_benefits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardsgonecrazy"."transaction_extended" ADD CONSTRAINT "transaction_extended_benefit_usage_id_benefit_usage_id_fk" FOREIGN KEY ("benefit_usage_id") REFERENCES "cardsgonecrazy"."benefit_usage"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardsgonecrazy"."user_alerts" ADD CONSTRAINT "user_alerts_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "cardsgonecrazy"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "benefit_account_period_idx" ON "cardsgonecrazy"."benefit_usage" USING btree ("card_benefit_id","plaid_account_id","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "issuer_product_idx" ON "cardsgonecrazy"."card_products" USING btree ("issuer","product_name");--> statement-breakpoint
CREATE UNIQUE INDEX "family_mask_official_idx" ON "cardsgonecrazy"."plaid_accounts" USING btree ("family_member_id","mask","official_name");