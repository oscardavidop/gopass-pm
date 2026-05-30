import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
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

    const client = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
    try {
      await client.connect();
      const pong = await client.ping();
      return { status: pong === 'PONG' ? 'ok' : 'error' };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Redis check failed' };
    } finally {
      client.disconnect();
    }
  }
}
