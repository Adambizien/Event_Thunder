-- CreateEnum
CREATE TYPE "TicketPurchaseStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "TicketCurrency" AS ENUM ('EUR', 'USD');

-- CreateTable
CREATE TABLE "ticket_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" "TicketCurrency" NOT NULL DEFAULT 'EUR',
    "max_quantity" INTEGER,
    "sold_quantity" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_purchases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "stripe_payment_intent_id" VARCHAR NOT NULL,
    "status" "TicketPurchaseStatus" NOT NULL DEFAULT 'pending',
    "total_amount" DECIMAL(10,2) NOT NULL,
    "currency" "TicketCurrency" NOT NULL DEFAULT 'EUR',
    "paid_at" TIMESTAMP(6),
    "failed_at" TIMESTAMP(6),
    "refunded_at" TIMESTAMP(6),
    "cancelled_at" TIMESTAMP(6),
    "failure_reason" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "ticket_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_purchases_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_purchase_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "currency" "TicketCurrency" NOT NULL DEFAULT 'EUR',
    "ticket_type_label" VARCHAR(120),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_purchases_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_purchase_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "attendee_firstname" VARCHAR NOT NULL,
    "attendee_lastname" VARCHAR NOT NULL,
    "attendee_email" VARCHAR,
    "ticket_number" VARCHAR NOT NULL,
    "QR_code" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ticket_types_event_id_is_active_idx" ON "ticket_types"("event_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_types_event_id_name_key" ON "ticket_types"("event_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_purchases_stripe_payment_intent_id_key" ON "ticket_purchases"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "ticket_purchases_user_id_idx" ON "ticket_purchases"("user_id");

-- CreateIndex
CREATE INDEX "ticket_purchases_status_created_at_idx" ON "ticket_purchases"("status", "created_at");

-- CreateIndex
CREATE INDEX "ticket_purchases_items_ticket_purchase_id_idx" ON "ticket_purchases_items"("ticket_purchase_id");

-- CreateIndex
CREATE INDEX "ticket_purchases_items_ticket_type_id_idx" ON "ticket_purchases_items"("ticket_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_purchases_items_ticket_purchase_id_ticket_type_id_key" ON "ticket_purchases_items"("ticket_purchase_id", "ticket_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_number_key" ON "tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "tickets_ticket_purchase_id_idx" ON "tickets"("ticket_purchase_id");

-- CreateIndex
CREATE INDEX "tickets_ticket_type_id_idx" ON "tickets"("ticket_type_id");

-- CreateIndex
CREATE INDEX "tickets_used_used_at_idx" ON "tickets"("used", "used_at");

-- AddForeignKey
ALTER TABLE "ticket_purchases_items" ADD CONSTRAINT "ticket_purchases_items_ticket_purchase_id_fkey" FOREIGN KEY ("ticket_purchase_id") REFERENCES "ticket_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_purchases_items" ADD CONSTRAINT "ticket_purchases_items_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ticket_purchase_id_fkey" FOREIGN KEY ("ticket_purchase_id") REFERENCES "ticket_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;