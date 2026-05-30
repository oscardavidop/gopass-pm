-- Add a persistent collaboration color per user for live-presence UI.
ALTER TABLE "users"
ADD COLUMN "collaboration_color" TEXT;
