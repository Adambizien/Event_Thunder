ALTER TABLE "plans"
DROP COLUMN IF EXISTS "max_events_period",
DROP COLUMN IF EXISTS "max_posts_period";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlanLimitPeriod') THEN
    DROP TYPE "PlanLimitPeriod";
  END IF;
END $$;
