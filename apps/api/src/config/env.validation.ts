import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_PREFIX: z.string().min(1).default('api/v1'),
  CORS_ORIGINS: z.string().min(1, 'CORS_ORIGINS is required'),
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),
  OAUTH_REDIRECT_ALLOWLIST: z.string().optional().default(''),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars').optional(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  THROTTLE_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
  SEND_REAL_EMAIL: z.string().optional().default('false'),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  ZAVU_API_KEY: z.string().optional(),
  ZAVU_SENDER_ID: z.string().optional(),
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

    if (!env.ZAVU_API_KEY) {
      throw new Error('ZAVU_API_KEY is required in production');
    }

    const sendRealEmail = String(env.SEND_REAL_EMAIL).toLowerCase() === 'true';
    if (sendRealEmail && !env.ZAVU_SENDER_ID) {
      throw new Error('ZAVU_SENDER_ID is required when SEND_REAL_EMAIL=true');
    }
  }

  return env;
}