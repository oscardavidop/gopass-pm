-- Add configurable project settings for permissions, priorities, and notification preferences.
ALTER TABLE "projects"
  ADD COLUMN "priority_labels" TEXT[] NOT NULL DEFAULT ARRAY['CRITICAL','HIGH','MEDIUM','LOW']::TEXT[],
  ADD COLUMN "invite_permission" "ProjectRole" NOT NULL DEFAULT 'ADMIN',
  ADD COLUMN "task_create_permission" "ProjectRole" NOT NULL DEFAULT 'MEMBER',
  ADD COLUMN "notification_settings" JSONB;
