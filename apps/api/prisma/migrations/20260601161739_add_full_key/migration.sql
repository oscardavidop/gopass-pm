-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN     "full_key" TEXT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "webhook_deliveries" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "webhooks" ALTER COLUMN "updated_at" DROP DEFAULT;
