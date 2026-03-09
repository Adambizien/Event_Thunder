-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "max_posts" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "max_events" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "subscriptions" ALTER COLUMN "updated_at" DROP DEFAULT;