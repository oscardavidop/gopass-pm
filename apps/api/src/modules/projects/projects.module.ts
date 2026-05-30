import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { EventsModule } from '../events/events.module';
import { EmailModule } from '../mail/email.module';

@Module({
  imports: [EventsModule, EmailModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
