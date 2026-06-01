import { Module } from '@nestjs/common';

import { DevelopersController } from './developers.controller';
import { DevelopersService } from './developers.service';
import { WebhookDispatchService } from './webhook-dispatch.service';

@Module({
  controllers: [DevelopersController],
  providers: [DevelopersService, WebhookDispatchService],
  exports: [DevelopersService, WebhookDispatchService],
})
export class DevelopersModule {}
