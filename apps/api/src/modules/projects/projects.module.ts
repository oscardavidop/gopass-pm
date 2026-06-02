import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { EventsModule } from '../events/events.module';
import { EmailModule } from '../mail/email.module';
import { DevelopersModule } from '../developers/developers.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [EventsModule, EmailModule, DevelopersModule, UploadsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
