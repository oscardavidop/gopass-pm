-- Session metadata for refresh tokens
ALTER TABLE "refresh_tokens"
  ADD COLUMN IF NOT EXISTS "country" TEXT,
  ADD COLUMN IF NOT EXISTS "last_used_at" TIMESTAMP(3);
