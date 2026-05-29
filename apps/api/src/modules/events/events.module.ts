import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import { PrismaModule } from '../../shared/database/prisma.module';

@Module({
  imports: [JwtModule.register({}), PrismaModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
