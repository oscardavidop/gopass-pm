DO $$ BEGIN
	CREATE TYPE "FileVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	CREATE TYPE "FileProvider" AS ENUM ('S3', 'R2', 'MINIO', 'AZURE', 'LOCAL');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "files"
	ADD COLUMN IF NOT EXISTS "original_name" TEXT,
	ADD COLUMN IF NOT EXISTS "storage_key" TEXT,
	ADD COLUMN IF NOT EXISTS "bucket" TEXT,
	ADD COLUMN IF NOT EXISTS "visibility" "FileVisibility" NOT NULL DEFAULT 'PRIVATE',
	ADD COLUMN IF NOT EXISTS "provider" "FileProvider" NOT NULL DEFAULT 'LOCAL',
	ADD COLUMN IF NOT EXISTS "public_url" TEXT,
	ADD COLUMN IF NOT EXISTS "etag" TEXT,
	ADD COLUMN IF NOT EXISTS "checksum" TEXT,
	ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "files"
SET
	"original_name" = COALESCE(NULLIF("original_name", ''), "filename"),
	"storage_key" = COALESCE(NULLIF("storage_key", ''), "path"),
	"bucket" = COALESCE("bucket", ''),
	"visibility" = CASE
		WHEN LOWER(COALESCE("kind", '')) IN ('avatar', 'icon', 'cover', 'banner', 'logo', 'landing', 'landing-asset', 'project-icon', 'project-cover', 'project-banner') THEN 'PUBLIC'::"FileVisibility"
		ELSE "visibility"
	END,
	"public_url" = CASE
		WHEN LOWER(COALESCE("kind", '')) IN ('avatar', 'icon', 'cover', 'banner', 'logo', 'landing', 'landing-asset', 'project-icon', 'project-cover', 'project-banner')
			THEN COALESCE("public_url", "url")
		ELSE "public_url"
	END,
	"updated_at" = CURRENT_TIMESTAMP
WHERE TRUE;

ALTER TABLE "files"
	ALTER COLUMN "original_name" SET NOT NULL,
	ALTER COLUMN "storage_key" SET NOT NULL,
	ALTER COLUMN "bucket" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "files_visibility_idx"
	ON "files"("visibility");

CREATE INDEX IF NOT EXISTS "files_provider_idx"
	ON "files"("provider");

CREATE INDEX IF NOT EXISTS "files_storage_key_idx"
	ON "files"("storage_key");
