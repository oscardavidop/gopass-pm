import { Module } from '@nestjs/common';

import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { WorkersAiProvider } from './ai.providers/workers-ai.provider';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [TasksModule],
  controllers: [AiController],
  providers: [AiService, WorkersAiProvider],
  exports: [AiService],
})
export class AiModule {}
