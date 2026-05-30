import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { PrismaModule } from '../../shared/database/prisma.module';
import { EventsModule } from '../events/events.module';
import { EmailModule } from '../mail/email.module';

@Module({
  imports: [PrismaModule, EventsModule, EmailModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
