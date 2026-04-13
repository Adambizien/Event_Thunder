-- CreateTable
CREATE TABLE "social_oauth_states" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "provider" "SocialProvider" NOT NULL,
  "state" VARCHAR(128) NOT NULL,
  "code_verifier" VARCHAR(128) NOT NULL,
  "redirect_uri" TEXT NOT NULL,
  "expires_at" TIMESTAMP(6) NOT NULL,
  "consumed_at" TIMESTAMP(6),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "social_oauth_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_oauth_states_state_key" ON "social_oauth_states"("state");

-- CreateIndex
CREATE INDEX "social_oauth_states_user_id_idx" ON "social_oauth_states"("user_id");

-- CreateIndex
CREATE INDEX "social_oauth_states_provider_idx" ON "social_oauth_states"("provider");

-- CreateIndex
CREATE INDEX "social_oauth_states_expires_at_idx" ON "social_oauth_states"("expires_at");
