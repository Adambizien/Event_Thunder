-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('draft', 'scheduled', 'awaiting_confirmation', 'published', 'archived');

-- CreateEnum
CREATE TYPE "SocialNetwork" AS ENUM ('x');

-- CreateEnum
CREATE TYPE "PostTargetStatus" AS ENUM ('pending', 'published', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "PostReminderStatus" AS ENUM ('pending', 'sent', 'cancelled');

-- CreateEnum
CREATE TYPE "SocialProvider" AS ENUM ('x');

-- CreateTable
CREATE TABLE "posts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_id" UUID,
  "user_id" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "status" "PostStatus" NOT NULL DEFAULT 'draft',
  "scheduled_at" TIMESTAMP(6),
  "published_at" TIMESTAMP(6),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,

  CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_targets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "post_id" UUID NOT NULL,
  "network" "SocialNetwork" NOT NULL,
  "status" "PostTargetStatus" NOT NULL DEFAULT 'pending',
  "external_post_id" VARCHAR(255),
  "error_message" VARCHAR(255),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "published_at" TIMESTAMP(6),

  CONSTRAINT "post_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_reminders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "post_id" UUID NOT NULL,
  "reminder_at" TIMESTAMP(6) NOT NULL,
  "message" VARCHAR(255),
  "status" "PostReminderStatus" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" TIMESTAMP(6),

  CONSTRAINT "post_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_confirmation_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "post_id" UUID NOT NULL,
  "token_hash" VARCHAR(64) NOT NULL,
  "expires_at" TIMESTAMP(6) NOT NULL,
  "consumed_at" TIMESTAMP(6),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "post_confirmation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "provider" "SocialProvider" NOT NULL,
  "provider_user_id" VARCHAR(255),
  "access_token_encrypted" TEXT NOT NULL,
  "refresh_token_encrypted" TEXT,
  "token_expires_at" TIMESTAMP(6),
  "scopes" TEXT,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,

  CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "posts_user_id_idx" ON "posts"("user_id");

-- CreateIndex
CREATE INDEX "posts_event_id_idx" ON "posts"("event_id");

-- CreateIndex
CREATE INDEX "posts_status_idx" ON "posts"("status");

-- CreateIndex
CREATE INDEX "posts_scheduled_at_idx" ON "posts"("scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "post_targets_post_id_network_key" ON "post_targets"("post_id", "network");

-- CreateIndex
CREATE INDEX "post_targets_post_id_idx" ON "post_targets"("post_id");

-- CreateIndex
CREATE INDEX "post_targets_status_idx" ON "post_targets"("status");

-- CreateIndex
CREATE INDEX "post_reminders_post_id_idx" ON "post_reminders"("post_id");

-- CreateIndex
CREATE INDEX "post_reminders_status_idx" ON "post_reminders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "post_confirmation_tokens_token_hash_key" ON "post_confirmation_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "post_confirmation_tokens_post_id_idx" ON "post_confirmation_tokens"("post_id");

-- CreateIndex
CREATE INDEX "post_confirmation_tokens_expires_at_idx" ON "post_confirmation_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_user_id_provider_key" ON "social_accounts"("user_id", "provider");

-- CreateIndex
CREATE INDEX "social_accounts_user_id_idx" ON "social_accounts"("user_id");

-- AddForeignKey
ALTER TABLE "post_targets" ADD CONSTRAINT "post_targets_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reminders" ADD CONSTRAINT "post_reminders_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_confirmation_tokens" ADD CONSTRAINT "post_confirmation_tokens_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
