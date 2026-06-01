import { Injectable } from '@nestjs/common';

import { CacheService } from './cache.service';

@Injectable()
export class CacheManager {
  constructor(private readonly cacheService: CacheService) {}

  async remember<T>(params: {
    key: string;
    ttlSeconds: number;
    loader: () => Promise<T>;
  }): Promise<T> {
    return this.cacheService.wrap<T>(params.key, params.loader, params.ttlSeconds);
  }

  async warm<T>(key: string, loader: () => Promise<T>, ttlSeconds: number) {
    const value = await loader();
    await this.cacheService.set(key, value, ttlSeconds);
    return value;
  }
}
