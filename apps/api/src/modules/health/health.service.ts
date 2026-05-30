import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { PrismaService } from '../../shared/database/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async summary() {
    const [db, realtime, email] = await Promise.all([
      this.database(),
      this.realtime(),
      this.email(),
    ]);
    const ok = db.status === 'ok' && realtime.status === 'ok' && email.status !== 'error';

    return {
      status: ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        db,
        realtime,
        email,
      },
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
