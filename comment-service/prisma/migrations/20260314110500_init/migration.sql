CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comment_likes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "comment_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "comments_user_id_idx" ON "comments"("user_id");
CREATE INDEX "comments_event_id_idx" ON "comments"("event_id");
CREATE INDEX "comment_likes_user_id_idx" ON "comment_likes"("user_id");
CREATE INDEX "comment_likes_comment_id_idx" ON "comment_likes"("comment_id");

ALTER TABLE "comment_likes"
ADD CONSTRAINT "comment_likes_comment_id_fkey"
FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;