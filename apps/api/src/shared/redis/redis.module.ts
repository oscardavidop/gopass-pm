import { Global, Module } from '@nestjs/common';

import { RedisService } from './redis.service';
import { CacheService } from './cache.service';
import { CacheManager } from './cache.manager';
import { CacheInvalidationService } from './cache-invalidation.service';

@Global()
@Module({
  providers: [RedisService, CacheService, CacheManager, CacheInvalidationService],
  exports: [RedisService, CacheService, CacheManager, CacheInvalidationService],
})
export class RedisModule {}
