CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "WebhookStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');

CREATE TABLE "api_keys" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "key_prefix" TEXT NOT NULL,
  "hashed_secret" TEXT NOT NULL,
  "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "last_used_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_id" TEXT NOT NULL,
  CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_key_usage" (
  "id" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "status_code" INTEGER NOT NULL,
  "duration_ms" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "api_key_id" TEXT NOT NULL,
  CONSTRAINT "api_key_usage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhooks" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "secret" TEXT,
  "status" "WebhookStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_id" TEXT NOT NULL,
  CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "api_keys_user_id_idx" ON "api_keys"("user_id");
CREATE INDEX "api_keys_status_idx" ON "api_keys"("status");
CREATE INDEX "api_keys_key_prefix_idx" ON "api_keys"("key_prefix");
CREATE INDEX "api_keys_expires_at_idx" ON "api_keys"("expires_at");
CREATE INDEX "api_keys_created_at_idx" ON "api_keys"("created_at");

CREATE INDEX "api_key_usage_api_key_id_idx" ON "api_key_usage"("api_key_id");
CREATE INDEX "api_key_usage_created_at_idx" ON "api_key_usage"("created_at");
CREATE INDEX "api_key_usage_api_key_id_created_at_idx" ON "api_key_usage"("api_key_id", "created_at");
CREATE INDEX "api_key_usage_status_code_idx" ON "api_key_usage"("status_code");

CREATE INDEX "webhooks_user_id_idx" ON "webhooks"("user_id");
CREATE INDEX "webhooks_status_idx" ON "webhooks"("status");
CREATE INDEX "webhooks_created_at_idx" ON "webhooks"("created_at");

ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "api_key_usage" ADD CONSTRAINT "api_key_usage_api_key_id_fkey"
  FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
