import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { GenerateTaskAiDto } from './dto/generate-task-ai.dto';
import { ImproveDescriptionAiDto } from './dto/improve-description-ai.dto';
import { GenerateSubtasksAiDto } from './dto/generate-subtasks-ai.dto';
import { SuggestPriorityAiDto } from './dto/suggest-priority-ai.dto';
import { TaskSuggestionsAiDto } from './dto/task-suggestions-ai.dto';
import { ConfirmGeneratedTaskAiDto } from './dto/confirm-generated-task-ai.dto';
import { RegenerateSectionsAiDto } from './dto/regenerate-sections-ai.dto';

@ApiTags('AI')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Controller('ai/tasks')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a complete task draft from user idea' })
  generateTask(@Body() dto: GenerateTaskAiDto, @CurrentUser() user: any) {
    return this.aiService.generateTask(dto, user.id);
  }

  @Post('improve-description')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Improve task description while preserving intent' })
  improveDescription(@Body() dto: ImproveDescriptionAiDto, @CurrentUser() user: any) {
    return this.aiService.improveDescription(dto, user.id);
  }

  @Post('subtasks')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Generate AI subtasks based on task context' })
  subtasks(@Body() dto: GenerateSubtasksAiDto, @CurrentUser() user: any) {
    return this.aiService.generateSubtasks(dto, user.id);
  }

  @Post('priority')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Suggest priority and effort estimation' })
  priority(@Body() dto: SuggestPriorityAiDto, @CurrentUser() user: any) {
    return this.aiService.suggestPriority(dto, user.id);
  }

  @Post('suggestions')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Generate AI task title suggestions' })
  suggestions(@Body() dto: TaskSuggestionsAiDto, @CurrentUser() user: any) {
    return this.aiService.suggestTaskTitles(dto, user.id);
  }

  @Post('regenerate-sections')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Regenerate selected sections for AI task preview' })
  regenerateSections(@Body() dto: RegenerateSectionsAiDto, @CurrentUser() user: any) {
    return this.aiService.regenerateSections(dto, user.id);
  }

  @Post('confirm')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Confirm AI-generated task and persist real task' })
  confirm(@Body() dto: ConfirmGeneratedTaskAiDto, @CurrentUser() user: any) {
    return this.aiService.confirmGeneratedTask(dto, user.id);
  }
}
