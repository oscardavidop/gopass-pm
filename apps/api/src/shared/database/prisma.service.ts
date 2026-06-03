import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { ConfigService } from "@nestjs/config";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static pool: Pool;


  constructor(private configService: ConfigService) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (!PrismaService.pool) {
      PrismaService.pool = new Pool({
        connectionString: configService.get<string>('DATABASE_URL'),
        ssl: {
          rejectUnauthorized: !isProduction,
        }
      });
    }
    const adapter = new PrismaPg(PrismaService.pool);
    super({ adapter } as any);
  }

  async onModuleInit() {
    await this.$queryRaw`SELECT 1`;
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await PrismaService.pool.end();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') return;

    const tablenames = await this.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

    for (const { tablename } of tablenames) {
      if (tablename !== '_prisma_migrations') {
        await this.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
      }
    }
  }
}