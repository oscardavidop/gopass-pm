import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { PrismaModule } from '../../shared/database/prisma.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [PrismaModule, EventsModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
