-- CreateEnum
CREATE TYPE "PlanLimitPeriod" AS ENUM ('weekly', 'monthly');

-- AlterTable
ALTER TABLE "plans"
ADD COLUMN "max_events_period" "PlanLimitPeriod" NOT NULL DEFAULT 'monthly',
ADD COLUMN "max_posts_period" "PlanLimitPeriod" NOT NULL DEFAULT 'monthly';