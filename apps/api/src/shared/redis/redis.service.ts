import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly subscriber: Redis;
  private readonly publisher: Redis;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL', 'redis://127.0.0.1:6379');
    const options: RedisOptions = {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    };

    this.client = new Redis(url, options);
    this.publisher = new Redis(url, options);
    this.subscriber = new Redis(url, options);

    this.attachConnectionLogs(this.client, 'client');
    this.attachConnectionLogs(this.publisher, 'publisher');
    this.attachConnectionLogs(this.subscriber, 'subscriber');
  }

  getClient() {
    return this.client;
  }

  getPublisher() {
    return this.publisher;
  }

  getSubscriber() {
    return this.subscriber;
  }

  async ping() {
    try {
      if (this.client.status === 'wait') await this.client.connect();
      return await this.client.ping();
    } catch (error) {
      this.logger.warn(`Redis ping failed: ${error instanceof Error ? error.message : String(error)}`);
      return 'ERROR';
    }
  }

  isReady() {
    return this.client.status === 'ready';
  }

  async safeGet<T = string>(key: string): Promise<T | null> {
    try {
      if (this.client.status === 'wait') await this.client.connect();
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  }

  async safeSet(key: string, value: unknown, ttlSeconds?: number) {
    try {
      if (this.client.status === 'wait') await this.client.connect();
      const payload = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, payload, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, payload);
      }
      return true;
    } catch {
      return false;
    }
  }

  async safeDel(...keys: string[]) {
    if (keys.length === 0) return 0;
    try {
      if (this.client.status === 'wait') await this.client.connect();
      return await this.client.del(...keys);
    } catch {
      return 0;
    }
  }

  async safeScanDelete(pattern: string) {
    try {
      if (this.client.status === 'wait') await this.client.connect();
      let cursor = '0';
      let totalDeleted = 0;

      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
        cursor = nextCursor;
        if (keys.length) {
          totalDeleted += await this.client.del(...keys);
        }
      } while (cursor !== '0');

      return totalDeleted;
    } catch {
      return 0;
    }
  }

  async onModuleDestroy() {
    await Promise.allSettled([
      this.client.quit(),
      this.publisher.quit(),
      this.subscriber.quit(),
    ]);
  }

  private attachConnectionLogs(client: Redis, label: string) {
    client.on('error', (error) => {
      this.logger.warn(`Redis ${label} error: ${error.message}`);
    });
    client.on('ready', () => {
      this.logger.log(`Redis ${label} ready`);
    });
  }
}
