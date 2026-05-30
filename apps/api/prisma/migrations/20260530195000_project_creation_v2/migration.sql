-- Project creation V2: visibility/workflow/icon, viewer role, invitations and user notification prefs

-- Extend existing enum safely.
ALTER TYPE "ProjectRole" ADD VALUE IF NOT EXISTS 'VIEWER';

-- New enums.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProjectVisibility') THEN
    CREATE TYPE "ProjectVisibility" AS ENUM ('PRIVATE', 'TEAM', 'PUBLIC');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProjectWorkflowType') THEN
    CREATE TYPE "ProjectWorkflowType" AS ENUM ('DEFAULT', 'CUSTOM');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProjectInvitationStatus') THEN
    CREATE TYPE "ProjectInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');
  END IF;
END $$;

-- Users prefs for notification routing.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "notification_prefs" JSONB;

-- Projects V2 fields.
ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "icon" TEXT,
  ADD COLUMN IF NOT EXISTS "visibility" "ProjectVisibility" NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN IF NOT EXISTS "workflow_type" "ProjectWorkflowType" NOT NULL DEFAULT 'DEFAULT',
  ADD COLUMN IF NOT EXISTS "workflow_states" TEXT[] NOT NULL DEFAULT ARRAY['TODO','IN_PROGRESS','REVIEW','DONE'];

UPDATE "projects"
SET "icon" = 'rocket'
WHERE "icon" IS NULL;

ALTER TABLE "projects"
  ALTER COLUMN "icon" SET DEFAULT 'rocket';

CREATE INDEX IF NOT EXISTS "projects_visibility_idx" ON "projects"("visibility");

-- Pending invitation records (existing + future users).
CREATE TABLE IF NOT EXISTS "project_invitations" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "status" "ProjectInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "role" "ProjectRole" NOT NULL DEFAULT 'MEMBER',
  "token" TEXT,
  "message" TEXT,
  "expires_at" TIMESTAMP(3),
  "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accepted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "project_id" TEXT NOT NULL,
  "invited_by_id" TEXT NOT NULL,
  "invited_user_id" TEXT,
  CONSTRAINT "project_invitations_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_invitations_invited_by_id_fkey"
    FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_invitations_invited_user_id_fkey"
    FOREIGN KEY ("invited_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_invitations_token_key" ON "project_invitations"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "project_invitations_project_id_email_status_key"
  ON "project_invitations"("project_id", "email", "status");
CREATE INDEX IF NOT EXISTS "project_invitations_project_id_idx" ON "project_invitations"("project_id");
CREATE INDEX IF NOT EXISTS "project_invitations_invited_by_id_idx" ON "project_invitations"("invited_by_id");
CREATE INDEX IF NOT EXISTS "project_invitations_invited_user_id_idx" ON "project_invitations"("invited_user_id");
CREATE INDEX IF NOT EXISTS "project_invitations_email_idx" ON "project_invitations"("email");
CREATE INDEX IF NOT EXISTS "project_invitations_status_idx" ON "project_invitations"("status");
