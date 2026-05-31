-- Uploads system: metadata table for files attached to multiple entities

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FileEntityType') THEN
    CREATE TYPE "FileEntityType" AS ENUM ('TASK', 'PROJECT', 'USER', 'COMMENT');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "files" (
  "id" TEXT PRIMARY KEY,
  "url" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "entity_type" "FileEntityType" NOT NULL,
  "entity_id" TEXT NOT NULL,
  "uploaded_by" TEXT NOT NULL,
  "kind" TEXT DEFAULT 'attachment',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "files_uploaded_by_fkey"
    FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "files_entity_type_entity_id_idx"
  ON "files"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "files_uploaded_by_idx"
  ON "files"("uploaded_by");
CREATE INDEX IF NOT EXISTS "files_created_at_idx"
  ON "files"("created_at");
