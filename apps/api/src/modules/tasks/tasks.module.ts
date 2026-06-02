import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { EventsModule } from '../events/events.module';
import { EmailModule } from '../mail/email.module';
import { DevelopersModule } from '../developers/developers.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [EventsModule, EmailModule, DevelopersModule, UploadsModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
