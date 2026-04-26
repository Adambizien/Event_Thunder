CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('User', 'Admin');

CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR NOT NULL,
    "password" VARCHAR NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'User',
    "stripe_customer_id" VARCHAR,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users_info" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "first_name" VARCHAR(50) DEFAULT '',
    "last_name" VARCHAR(50) DEFAULT '',
    "phone_number" VARCHAR(30) DEFAULT '',
    CONSTRAINT "users_info_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");
CREATE UNIQUE INDEX "users_info_user_id_key" ON "users_info"("user_id");

ALTER TABLE "users_info"
ADD CONSTRAINT "users_info_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;