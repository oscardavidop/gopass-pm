import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  REDIS_PREFIX: z.string().min(1).default('tasku'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_PREFIX: z.string().min(1).default('api/v1'),
  CORS_ORIGINS: z.string().min(1, 'CORS_ORIGINS is required'),
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),
  OAUTH_REDIRECT_ALLOWLIST: z.string().optional().default(''),
  COOKIE_DOMAIN: z.string().optional().default(''),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).optional().default('lax'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars').optional(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  API_KEY_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(1000),
  THROTTLE_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
  CACHE_TTL_USER: z.coerce.number().int().positive().default(300),
  CACHE_TTL_PROJECT: z.coerce.number().int().positive().default(120),
  CACHE_TTL_TASK: z.coerce.number().int().positive().default(90),
  CACHE_TTL_ACTIVITY: z.coerce.number().int().positive().default(30),
  CACHE_TTL_DASHBOARD: z.coerce.number().int().positive().default(60),
  SEND_REAL_EMAIL: z.string().optional().default('false'),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  ZAVU_API_KEY: z.string().optional(),
  ZAVU_SENDER_ID: z.string().optional(),
  UPLOADS_PROVIDER: z.enum(['local', 's3', 'r2', 'minio', 'azure']).optional().default('s3'),
  UPLOADS_LOCAL_ROOT: z.string().optional().default('storage/uploads'),
  UPLOADS_MAX_FILE_SIZE_MB: z.coerce.number().int().positive().optional().default(25),
  UPLOADS_ANTIVIRUS_ENABLED: z.string().optional().default('false'),
  UPLOADS_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().optional().default(900),
  UPLOADS_SIGNING_SECRET: z.string().min(32, 'UPLOADS_SIGNING_SECRET must be at least 32 chars'),
  UPLOADS_S3_BUCKET: z.string().optional().default(''),
  UPLOADS_S3_REGION: z.string().optional().default('auto'),
  UPLOADS_S3_ENDPOINT: z.string().optional().default(''),
  UPLOADS_S3_ACCESS_KEY: z.string().optional().default(''),
  UPLOADS_S3_SECRET_KEY: z.string().optional().default(''),
  UPLOADS_S3_PUBLIC_BASE_URL: z.string().optional().default(''),
  UPLOADS_S3_FORCE_PATH_STYLE: z.string().optional().default('true'),
});

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const env = parsed.data;

  if (env.NODE_ENV === 'production') {
    if (!env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required in production');
    }

    if (env.JWT_ACCESS_SECRET.includes('change_me') || env.JWT_REFRESH_SECRET.includes('change_me')) {
      throw new Error('Production secrets cannot use placeholder values');
    }

    if (!env.UPLOADS_SIGNING_SECRET || env.UPLOADS_SIGNING_SECRET.length < 32) {
      throw new Error('UPLOADS_SIGNING_SECRET must be at least 32 chars in production');
    }

    if (!env.ZAVU_API_KEY) {
      throw new Error('ZAVU_API_KEY is required in production');
    }

    const sendRealEmail = String(env.SEND_REAL_EMAIL).toLowerCase() === 'true';
    if (sendRealEmail && !env.ZAVU_SENDER_ID) {
      throw new Error('ZAVU_SENDER_ID is required when SEND_REAL_EMAIL=true');
    }

    if (env.COOKIE_SAME_SITE === 'none' && env.FRONTEND_URL.startsWith('http://')) {
      throw new Error('COOKIE_SAME_SITE=none requires HTTPS frontend URL in production');
    }

    if (env.UPLOADS_PROVIDER !== 'local' && !env.UPLOADS_S3_BUCKET) {
      throw new Error('UPLOADS_S3_BUCKET is required when UPLOADS_PROVIDER is not local');
    }
  }

  return env;
}