import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../shared/database/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { RedisService } from '../../shared/redis/redis.service';
import { CacheService } from '../../shared/redis/cache.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly eventsGateway: EventsGateway,
    private readonly redisService: RedisService,
    private readonly cacheService: CacheService,
  ) {}

  async summary() {
    const [api, database, redis, realtime, email, cache] = await Promise.all([
      this.api(),
      this.database(),
      this.checkRedis(),
      this.realtime(),
      this.email(),
      this.cache(),
    ]);
    const ok = api.status === 'ok' && database.status === 'ok' && redis.status === 'ok';

    return {
      status: ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        api,
        database,
        redis,
        realtime,
        email,
        cache,
      },
    };
  }

  async api() {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Number(process.uptime().toFixed(2)),
      pid: process.pid,
      nodeEnv: this.config.get<string>('NODE_ENV', 'development'),
    };
  }

  async database() {
    return this.checkDatabase();
  }

  async realtime() {
    const hasServer = !!this.eventsGateway.server;
    return {
      status: hasServer ? 'ok' : 'error',
      message: hasServer ? undefined : 'WebSocket server is not initialized',
    };
  }

  async email() {
    const sendRealEmail = String(this.config.get('SEND_REAL_EMAIL', 'false')).toLowerCase() === 'true';
    if (!sendRealEmail) {
      return { status: 'ok', mode: 'preview' };
    }

    const zavuApiKey = this.config.get<string>('ZAVU_API_KEY');
    const zavuSenderId = this.config.get<string>('ZAVU_SENDER_ID');
    const valid = !!zavuApiKey && !!zavuSenderId;

    return {
      status: valid ? 'ok' : 'error',
      mode: 'provider',
      message: valid ? undefined : 'Email provider is missing ZAVU_API_KEY or ZAVU_SENDER_ID',
    };
  }

  async live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async cache() {
    const metrics = await this.cacheService.getMetrics();
    return {
      status: metrics.redisReady ? 'ok' : 'degraded',
      ...metrics,
    };
  }

  async ready() {
    const [db, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);
    const ok = db.status === 'ok' && redis.status === 'ok';

    return {
      status: ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: db,
        redis,
      },
    };
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Database check failed' };
    }
  }

  private async checkRedis() {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) return { status: 'error', message: 'REDIS_URL is not configured' };

    try {
      const pong = await this.redisService.ping();
      return { status: pong === 'PONG' ? 'ok' : 'error' };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Redis check failed' };
    }
  }
}
