import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyStatus, Prisma, WebhookStatus } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';

import { PrismaService } from '../../shared/database/prisma.service';
import { CacheManager } from '../../shared/redis/cache.manager';
import { CacheInvalidationService } from '../../shared/redis/cache-invalidation.service';
import { CacheKeys } from '../../shared/redis/cache-keys';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CreateWebhookDto } from './dto/create-webhook.dto';

const DEFAULT_SCOPES = ['projects:read', 'tasks:read'];

@Injectable()
export class DevelopersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly cacheManager: CacheManager,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  async createApiKey(userId: string, dto: CreateApiKeyDto) {
    const key = this.generateApiKey();
    const now = new Date();
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new ForbiddenException('Invalid expiration date');
    }

    const created = await this.prisma.apiKey.create({
      data: {
        userId,
        name: dto.name,
        keyPrefix: key.prefix,
        hashedSecret: key.hash,
        scopes: this.normalizeScopes(dto.scopes),
        expiresAt,
        status: !expiresAt || expiresAt > now ? ApiKeyStatus.ACTIVE : ApiKeyStatus.EXPIRED,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    await this.cacheInvalidation.invalidateApiKey('all');
    await this.cacheInvalidation.invalidateDashboard();

    return {
      ...created,
      key: key.full,
      warning: 'Store this API key now. It will not be shown again.',
    };
  }

  listApiKeys(userId: string) {
    return this.cacheManager.remember({
      key: `tasku:developers:${userId}:keys`,
      ttlSeconds: this.config.get('CACHE_TTL_DEVELOPER', 980000),
      loader: () => this.prisma.apiKey.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          scopes: true,
          status: true,
          usageCount: true,
          lastUsedAt: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
    });
  }

  async revokeApiKey(userId: string, id: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id }, select: { userId: true } });
    if (!key || key.userId !== userId) throw new NotFoundException('API key not found');

    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: { status: ApiKeyStatus.REVOKED },
      select: { id: true, status: true },
    });

    await this.cacheInvalidation.invalidateApiKey('all');
    await this.cacheInvalidation.invalidateDashboard();
    return updated;
  }

  async getUsageSummary(userId: string) {
    const keyIds = await this.prisma.apiKey.findMany({
      where: { userId },
      select: { id: true },
    });
    const ids = keyIds.map((k) => k.id);
    if (ids.length === 0) {
      return {
        todayRequests: 0,
        monthRequests: 0,
        errorRequests: 0,
        averageResponseMs: 0,
      };
    }

    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return this.cacheManager.remember({
      key: `tasku:developers:${userId}:usage:summary`,
      ttlSeconds: this.config.get('CACHE_TTL_DEVELOPER', 980000),
      loader: async () => {
        const [todayRequests, monthRequests, errorRequests, avgResult] = await Promise.all([
          this.prisma.apiKeyUsage.count({ where: { apiKeyId: { in: ids }, createdAt: { gte: startToday } } }),
          this.prisma.apiKeyUsage.count({ where: { apiKeyId: { in: ids }, createdAt: { gte: startMonth } } }),
          this.prisma.apiKeyUsage.count({ where: { apiKeyId: { in: ids }, statusCode: { gte: 400 }, createdAt: { gte: startMonth } } }),
          this.prisma.apiKeyUsage.aggregate({
            where: { apiKeyId: { in: ids }, createdAt: { gte: startMonth } },
            _avg: { durationMs: true },
          }),
        ]);

        return {
          todayRequests,
          monthRequests,
          errorRequests,
          averageResponseMs: Math.round(avgResult._avg.durationMs ?? 0),
        };
      },
    });
  }

  async getRecentUsage(userId: string, limit = 30) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    return this.cacheManager.remember({
      key: `tasku:developers:${userId}:usage:recent:${safeLimit}`,
      ttlSeconds: this.config.get('CACHE_TTL_DEVELOPER', 980000),
      loader: () => this.prisma.apiKeyUsage.findMany({
        where: { apiKey: { userId } },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        select: {
          id: true,
          method: true,
          endpoint: true,
          statusCode: true,
          durationMs: true,
          createdAt: true,
          apiKey: {
            select: {
              id: true,
              name: true,
              keyPrefix: true,
            },
          },
        },
      }),
    });
  }

  async listWebhooks(userId: string) {
    return this.prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        status: true,
        createdAt: true,
      },
    });
  }

  createWebhook(userId: string, dto: CreateWebhookDto) {
    return this.prisma.webhook.create({
      data: {
        userId,
        name: dto.name,
        url: dto.url,
        events: this.normalizeEvents(dto.events),
        status: WebhookStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        status: true,
        createdAt: true,
      },
    }).then(async (created) => {
      await this.cacheInvalidation.invalidateDashboard();
      return created;
    });
  }

  async disableWebhook(userId: string, id: string) {
    const hook = await this.prisma.webhook.findUnique({ where: { id }, select: { userId: true } });
    if (!hook || hook.userId !== userId) throw new NotFoundException('Webhook not found');

    return this.prisma.webhook.update({
      where: { id },
      data: { status: WebhookStatus.DISABLED },
      select: { id: true, status: true },
    }).then(async (updated) => {
      await this.cacheInvalidation.invalidateDashboard();
      return updated;
    });
  }

  getDocs(baseUrl: string) {
    return this.cacheManager.remember({
      key: `tasku:developers:docs:${baseUrl}`,
      ttlSeconds: this.config.get('CACHE_TTL_DEVELOPER', 980000),
      loader: async () => ({
        title: 'Tasku Developer API',
        version: 'v1',
        baseUrl,
        auth: {
          bearer: 'Authorization: Bearer <jwt_access_token>',
          apiKeyHeader: 'X-API-Key: tasku_live_<secret>',
          apiKeyAuthHeader: 'Authorization: ApiKey tasku_live_<secret>',
        },
        scopes: [
          'projects:read',
          'projects:write',
          'tasks:read',
          'tasks:write',
          'files:read',
          'files:write',
          'notifications:read',
        ],
        webhookEvents: [
          'task.created',
          'task.updated',
          'task.completed',
          'project.created',
          'project.updated',
        ],
      }),
    });
  }

  private generateApiKey() {
    const random = randomBytes(24).toString('base64url');
    const full = `tasku_live_${random}`;
    return {
      full,
      prefix: full.slice(0, 18),
      hash: createHash('sha256').update(full).digest('hex'),
    };
  }

  private normalizeScopes(scopes?: string[]) {
    const clean = (scopes ?? DEFAULT_SCOPES)
      .map((scope) => scope.trim())
      .filter(Boolean);

    return Array.from(new Set(clean));
  }

  private normalizeEvents(events?: string[]) {
    const defaults = ['task.created', 'task.updated'];
    const clean = (events ?? defaults).map((event) => event.trim()).filter(Boolean);
    return Array.from(new Set(clean));
  }

  async resolveApiKey(rawKey: string) {
    const digest = createHash('sha256').update(rawKey).digest('hex');

    return this.cacheManager.remember({
      key: CacheKeys.apiKey(digest),
      ttlSeconds: Number(this.config.get<string>('CACHE_TTL_USER', '300')),
      loader: async () => {
        const prefix = rawKey.slice(0, 18);
        const apiKey = await this.prisma.apiKey.findFirst({
          where: {
            keyPrefix: prefix,
            status: ApiKeyStatus.ACTIVE,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        });

        if (!apiKey) return null;
        if (digest !== apiKey.hashedSecret) return null;

        if (apiKey.expiresAt && apiKey.expiresAt <= new Date()) {
          await this.prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { status: ApiKeyStatus.EXPIRED },
          });
          return null;
        }

        return apiKey;
      },
    });
  }

  async validateApiKeyRateLimit(apiKeyId: string, limitPerHour: number) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await this.prisma.apiKeyUsage.count({
      where: {
        apiKeyId,
        createdAt: { gte: oneHourAgo },
      },
    });

    return {
      current: count,
      remaining: Math.max(limitPerHour - count, 0),
      allowed: count < limitPerHour,
    };
  }

  async trackApiKeyUsage(params: {
    apiKeyId: string;
    method: string;
    endpoint: string;
    statusCode: number;
    durationMs: number;
  }) {
    const data: Prisma.ApiKeyUsageCreateInput = {
      method: params.method,
      endpoint: params.endpoint,
      statusCode: params.statusCode,
      durationMs: params.durationMs,
      apiKey: {
        connect: {
          id: params.apiKeyId,
        },
      },
    };

    await this.prisma.$transaction([
      this.prisma.apiKeyUsage.create({ data }),
      this.prisma.apiKey.update({
        where: { id: params.apiKeyId },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      }),
    ]);

    await this.cacheInvalidation.invalidateDashboard();
  }
}
