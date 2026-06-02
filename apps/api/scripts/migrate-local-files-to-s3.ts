import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient, FileProvider, FileVisibility, FileEntityType } from '@prisma/client';
import { createHash } from 'crypto';
import { existsSync, promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const PUBLIC_KINDS = new Set([
  'avatar',
  'icon',
  'cover',
  'banner',
  'logo',
  'landing',
  'landing-asset',
  'project-icon',
  'project-cover',
  'project-banner',
]);

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function normalizeKind(kind?: string | null) {
  return (kind || 'attachment').trim().toLowerCase();
}

function resolveVisibility(entityType: FileEntityType, kind: string): FileVisibility {
  if (entityType === FileEntityType.USER && kind === 'avatar') return FileVisibility.PUBLIC;
  if (entityType === FileEntityType.PROJECT && PUBLIC_KINDS.has(kind)) return FileVisibility.PUBLIC;
  return PUBLIC_KINDS.has(kind) ? FileVisibility.PUBLIC : FileVisibility.PRIVATE;
}

function buildPublicUrl(baseUrl: string, key: string) {
  return `${baseUrl.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
}

function findLocalFile(root: string, storageKey: string) {
  const candidates = [
    path.resolve(root, storageKey),
    path.resolve(process.cwd(), storageKey),
    path.resolve(process.cwd(), 'storage', 'uploads', storageKey),
  ];

  return candidates.find((candidate) => existsSync(candidate)) || null;
}

async function main() {
  const bucket = requiredEnv('UPLOADS_S3_BUCKET');
  const region = process.env.UPLOADS_S3_REGION || 'us-east-1';
  const endpoint = process.env.UPLOADS_S3_ENDPOINT;
  const accessKeyId = requiredEnv('UPLOADS_S3_ACCESS_KEY');
  const secretAccessKey = requiredEnv('UPLOADS_S3_SECRET_KEY');
  const forcePathStyle = String(process.env.UPLOADS_S3_FORCE_PATH_STYLE || 'false') === 'true';
  const localRoot = path.resolve(process.cwd(), process.env.UPLOADS_LOCAL_ROOT || 'storage/uploads');
  const publicBaseUrl = process.env.UPLOADS_S3_PUBLIC_BASE_URL || `https://${bucket}.s3.${region}.amazonaws.com`;
  const apiPrefix = (process.env.API_PREFIX || 'api/v1').replace(/^\/+|\/+$/g, '');

  const s3 = new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const files = await prisma.file.findMany({
    where: {
      provider: FileProvider.LOCAL,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${files.length} local files to migrate`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const storageKey = file.storageKey || file.path;
    if (!storageKey) {
      skipped += 1;
      console.warn(`[SKIP] ${file.id} has no storage key/path`);
      continue;
    }

    const localPath = findLocalFile(localRoot, storageKey);
    if (!localPath) {
      skipped += 1;
      console.warn(`[SKIP] ${file.id} file not found on disk for key ${storageKey}`);
      continue;
    }

    try {
      const buffer = await fs.readFile(localPath);
      const kind = normalizeKind(file.kind);
      const visibility = file.visibility || resolveVisibility(file.entityType, kind);
      const cacheControl = visibility === FileVisibility.PUBLIC
        ? 'public, max-age=31536000, immutable'
        : 'private, max-age=0, no-cache';
      const checksum = createHash('sha256').update(buffer).digest('hex');

      const result = await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: file.mimeType,
        CacheControl: cacheControl,
      }));

      const publicUrl = visibility === FileVisibility.PUBLIC
        ? buildPublicUrl(publicBaseUrl, storageKey)
        : null;
      const canonicalUrl: string = visibility === FileVisibility.PUBLIC
        ? (publicUrl || buildPublicUrl(publicBaseUrl, storageKey))
        : `/${apiPrefix}/files/${file.id}`;

      await prisma.file.update({
        where: { id: file.id },
        data: {
          storageKey,
          bucket,
          provider: FileProvider.S3,
          visibility,
          publicUrl,
          url: canonicalUrl,
          etag: result.ETag,
          checksum,
        },
      });

      migrated += 1;
      console.log(`[OK] ${file.id} -> s3://${bucket}/${storageKey}`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[FAIL] ${file.id} ${message}`);
    }
  }

  console.log(`Migration done. migrated=${migrated} skipped=${skipped} failed=${failed}`);
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Fatal: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
