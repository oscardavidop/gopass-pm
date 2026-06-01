import { Injectable } from '@nestjs/common';

import { RedisService } from './redis.service';
import { CacheKeys } from './cache-keys';

@Injectable()
export class CacheService {
  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.safeGet<T>(key);
    await this.bumpMetric(data ? 'cache_hits' : 'cache_misses');
    return data;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number) {
    return this.redis.safeSet(key, value, ttlSeconds);
  }

  async del(...keys: string[]) {
    return this.redis.safeDel(...keys);
  }

  async delByPattern(pattern: string) {
    return this.redis.safeScanDelete(pattern);
  }

  async wrap<T>(key: string, loader: () => Promise<T>, ttlSeconds: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await loader();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  async getMetrics() {
    const [hits, misses, memoryInfo] = await Promise.all([
      this.redis.safeGet<number>(CacheKeys.metric('cache_hits')),
      this.redis.safeGet<number>(CacheKeys.metric('cache_misses')),
      this.readMemoryInfo(),
    ]);

    const safeHits = Number(hits ?? 0);
    const safeMisses = Number(misses ?? 0);
    const total = safeHits + safeMisses;
    const hitRatio = total > 0 ? Number(((safeHits / total) * 100).toFixed(2)) : 0;

    return {
      hits: safeHits,
      misses: safeMisses,
      hitRatio,
      memoryUsage: memoryInfo.memoryUsage,
      evictedKeys: memoryInfo.evictedKeys,
      redisReady: this.redis.isReady(),
    };
  }

  private async bumpMetric(name: string) {
    try {
      const client = this.redis.getClient();
      if (client.status === 'wait') await client.connect();
      await client.incr(CacheKeys.metric(name));
    } catch {
      // Metrics must never break request flow.
    }
  }

  private async readMemoryInfo() {
    try {
      const client = this.redis.getClient();
      if (client.status === 'wait') await client.connect();
      const info = await client.info('memory');
      const stats = await client.info('stats');
      const memoryUsage = this.extractInfoValue(info, 'used_memory_human') || 'n/a';
      const evicted = this.extractInfoValue(stats, 'evicted_keys') || '0';
      return { memoryUsage, evictedKeys: Number(evicted) };
    } catch {
      return { memoryUsage: 'n/a', evictedKeys: 0 };
    }
  }

  private extractInfoValue(raw: string, key: string) {
    const line = raw.split('\n').find((item) => item.startsWith(`${key}:`));
    if (!line) return null;
    return line.slice(key.length + 1).trim();
  }
}
