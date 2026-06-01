import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { ServerOptions } from 'socket.io';

import { RedisService } from './redis.service';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(
    app: INestApplicationContext,
    private readonly redisService: RedisService,
  ) {
    super(app);
  }

  async connectToRedis() {
    try {
      const pubClient = this.redisService.getPublisher();
      const subClient = this.redisService.getSubscriber();

      if (pubClient.status === 'wait') await pubClient.connect();
      if (subClient.status === 'wait') await subClient.connect();

      this.adapterConstructor = createAdapter(pubClient as any, subClient as any);
      this.logger.log('Socket.IO Redis adapter enabled');
    } catch (error) {
      this.logger.warn(`Socket.IO Redis adapter disabled (fallback to local): ${error instanceof Error ? error.message : String(error)}`);
      this.adapterConstructor = null;
    }
  }

  override createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
