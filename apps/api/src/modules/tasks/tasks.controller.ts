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
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { ReorderSubtasksDto } from './dto/reorder-subtasks.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

class CreateCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
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
    return this.tasksService.create(projectId, dto, user.id, user.role);
  }

  @Get('projects/:projectId/tasks')
  @ApiOperation({ summary: 'List tasks in project' })
  findAll(
    @Param('projectId') projectId: string,
    @Query() filters: FilterTasksDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.findAllByProject(projectId, user.id, filters, user.role);
  }

  // ── Standalone task routes ───────────────────────────────
  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get task details with comments and activity' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.findOne(id, user.id, user.role);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update task' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: any) {
    return this.tasksService.update(id, dto, user.id, user.role);
  }

  @Patch('tasks/:id/status')
  @ApiOperation({ summary: 'Update task status (Kanban)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.updateStatus(id, dto, user.id, user.role);
  }

  @Delete('tasks/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete task' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.remove(id, user.id, user.role);
  }

  @Get('tasks/:id/activity')
  @ApiOperation({ summary: 'Get task audit log' })
  getActivity(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    return this.tasksService.getActivity(id, user.id, user.role, Number(limit || 100));
  }

  // ── Comments ─────────────────────────────────────────────
  @Post('tasks/:id/comments')
  @ApiOperation({ summary: 'Add comment to task' })
  addComment(
    @Param('id') taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.addComment(taskId, dto.content, user.id, user.role);
  }

  @Delete('tasks/:taskId/comments/:commentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete comment' })
  deleteComment(
    @Param('commentId') commentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.deleteComment(commentId, user.id, user.role);
  }

  // ── Subtasks ─────────────────────────────────────────────
  @Post('tasks/:id/subtasks')
  @ApiOperation({ summary: 'Create subtask' })
  createSubtask(
    @Param('id') taskId: string,
    @Body() dto: CreateSubtaskDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.addSubtask(taskId, dto, user.id, user.role);
  }

  @Patch('tasks/:taskId/subtasks/:subtaskId')
  @ApiOperation({ summary: 'Update subtask' })
  updateSubtask(
    @Param('taskId') taskId: string,
    @Param('subtaskId') subtaskId: string,
    @Body() dto: UpdateSubtaskDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.updateSubtask(taskId, subtaskId, dto, user.id, user.role);
  }

  @Delete('tasks/:taskId/subtasks/:subtaskId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete subtask' })
  deleteSubtask(
    @Param('taskId') taskId: string,
    @Param('subtaskId') subtaskId: string,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.removeSubtask(taskId, subtaskId, user.id, user.role);
  }

  @Patch('tasks/:taskId/subtasks/reorder')
  @ApiOperation({ summary: 'Reorder subtasks' })
  reorderSubtasks(
    @Param('taskId') taskId: string,
    @Body() dto: ReorderSubtasksDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.reorderSubtasks(taskId, dto.orderedIds, user.id, user.role);
  }
}
