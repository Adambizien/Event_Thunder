CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "PlanInterval" AS ENUM ('monthly', 'yearly');
CREATE TYPE "PlanCurrency" AS ENUM ('EUR', 'USD');
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'canceled');
CREATE TYPE "PaymentStatus" AS ENUM ('paid', 'failed');
CREATE TYPE "PaymentCurrency" AS ENUM ('EUR', 'USD');

CREATE TABLE "plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "interval" "PlanInterval" NOT NULL,
    "currency" "PlanCurrency" NOT NULL DEFAULT 'EUR',
    "stripe_price_id" VARCHAR NOT NULL,
    "max_events" INTEGER NOT NULL DEFAULT 2,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "stripe_subscription_id" VARCHAR NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "current_period_start" TIMESTAMP(6),
    "current_period_end" TIMESTAMP(6),
    "canceled_at" TIMESTAMP(6),
    "ended_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments_sub_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subscription_id" UUID NOT NULL,
    "stripe_invoice_id" VARCHAR NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "PaymentCurrency" NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "paid_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_sub_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plans_stripe_price_id_key" ON "plans"("stripe_price_id");
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");
CREATE UNIQUE INDEX "payments_sub_history_stripe_invoice_id_key" ON "payments_sub_history"("stripe_invoice_id");

ALTER TABLE "subscriptions"
ADD CONSTRAINT "subscriptions_plan_id_fkey"
FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments_sub_history"
ADD CONSTRAINT "payments_sub_history_subscription_id_fkey"
FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;