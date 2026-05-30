import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { EventsModule } from '../events/events.module';
import { EmailModule } from '../mail/email.module';

@Module({
  imports: [EventsModule, EmailModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
