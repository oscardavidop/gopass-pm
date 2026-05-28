import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { FilterTasksDto } from './dto/filter-tasks.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

class CreateCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}

@ApiTags('Tasks')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // ── Task routes under /projects/:projectId ──────────────
  @Post('projects/:projectId/tasks')
  @ApiOperation({ summary: 'Create task in project' })
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.create(projectId, dto, user.id);
  }

  @Get('projects/:projectId/tasks')
  @ApiOperation({ summary: 'List tasks in project' })
  findAll(
    @Param('projectId') projectId: string,
    @Query() filters: FilterTasksDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.findAllByProject(projectId, user.id, filters);
  }

  // ── Standalone task routes ───────────────────────────────
  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get task details with comments and activity' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.findOne(id, user.id);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update task' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: any) {
    return this.tasksService.update(id, dto, user.id);
  }

  @Patch('tasks/:id/status')
  @ApiOperation({ summary: 'Update task status (Kanban)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.updateStatus(id, dto, user.id);
  }

  @Delete('tasks/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete task' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.remove(id, user.id);
  }

  @Get('tasks/:id/activity')
  @ApiOperation({ summary: 'Get task audit log' })
  getActivity(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.getActivity(id, user.id);
  }

  // ── Comments ─────────────────────────────────────────────
  @Post('tasks/:id/comments')
  @ApiOperation({ summary: 'Add comment to task' })
  addComment(
    @Param('id') taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.addComment(taskId, dto.content, user.id);
  }

  @Delete('tasks/:taskId/comments/:commentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete comment' })
  deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.deleteComment(commentId, user.id, user.role);
  }
}
