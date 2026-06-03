import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createShardedAdapter, createAdapter } from '@socket.io/redis-adapter';
import { ServerOptions } from 'socket.io';
import { RedisService } from './redis.service';
import {ConfigService} from "@nestjs/config";

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: any = null;

  constructor(
    app: INestApplicationContext,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis() {
    try {
      const pubClient = this.redisService.getPublisher();
      const subClient = this.redisService.getSubscriber();
      
      if (pubClient.status === 'wait') await pubClient.connect();
      if (subClient.status === 'wait') await subClient.connect();
      
      const isClusterMode = this.configService.get<boolean>('REDIS_SERVERLESS', false);

      if (isClusterMode) {
        this.adapterConstructor = createShardedAdapter(pubClient as any, subClient as any);
      } else {
        this.adapterConstructor = createAdapter(pubClient as any, subClient as any);
      }
      
    } catch (error) {
      this.logger.error('Error al inicializar el adaptador de Redis para Socket.IO', error);
      this.adapterConstructor = null;
    }
  }

  override createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    } else {
      this.logger.warn('Socket.IO iniciado sin adaptador de Redis (Fallback a memoria local)');
    }
    return server;
  }
}