DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.tables
		WHERE table_schema = 'public'
			AND table_name = 'project_invitations'
	) THEN
		ALTER TABLE "project_invitations" ALTER COLUMN "updated_at" DROP DEFAULT;
	END IF;
END $$;
