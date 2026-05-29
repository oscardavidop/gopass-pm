import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Role, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { FilterTasksDto } from './dto/filter-tasks.dto';

@Injectable()
export class TasksService {
  private static readonly DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async create(projectId: string, dto: CreateTaskDto, userId: string) {
    await this.assertProjectAccess(projectId, userId);

    const dueDate = this.normalizeDueDate(dto.dueDate);

    const task = await this.prisma.task.create({
      data: {
        ...dto,
        projectId,
        creatorId: userId,
        dueDate,
      },
      include: this.taskIncludes(),
    });

    this.events.emitTaskCreated(projectId, task);
    return task;
  }

  async findAllByProject(projectId: string, userId: string, filters: FilterTasksDto) {
    await this.assertProjectAccess(projectId, userId);

    const { search, status, priority, assigneeId, page = 1, limit = 50, sortBy = 'position', order = 'asc' } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      projectId,
      deletedAt: null,
      ...(status && { status }),
      ...(priority && { priority }),
      ...(assigneeId && { assigneeId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        include: this.taskIncludes(),
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...this.taskIncludes(),
        comments: {
          where: { deletedAt: null },
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        activityLogs: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    await this.assertProjectAccess(task.projectId, userId);

    return task;
  }

  async update(id: string, dto: UpdateTaskDto, userId: string) {
    const task = await this.findOne(id, userId);
    const oldValues: Record<string, any> = {};
    const changes: string[] = [];
    const dueDate = this.normalizeDueDate(dto.dueDate);

    if (dto.status && dto.status !== task.status) {
      oldValues.status = task.status;
      changes.push('status');
    }
    if (dto.assigneeId !== undefined && dto.assigneeId !== task.assigneeId) {
      oldValues.assigneeId = task.assigneeId;
      changes.push('assignee');
    }
    if (dto.priority && dto.priority !== task.priority) {
      oldValues.priority = task.priority;
      changes.push('priority');
    }
    if (dto.dueDate !== undefined) {
      const oldDueDate = task.dueDate ? task.dueDate.toISOString() : null;
      const newDueDate = dueDate ? dueDate.toISOString() : null;
      if (oldDueDate !== newDueDate) {
        oldValues.dueDate = task.dueDate;
        changes.push('dueDate');
      }
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        ...dto,
        dueDate,
      },
      include: this.taskIncludes(),
    });

    this.events.emitTaskUpdated(updated.projectId, updated);

    // Audit log
    if (changes.length > 0) {
      await this.prisma.activityLog.create({
        data: {
          action: 'UPDATED',
          entity: 'Task',
          entityId: id,
          oldValue: oldValues,
          newValue: changes.reduce((acc, key) => ({ ...acc, [key]: (updated as any)[key] }), {}),
          userId,
          taskId: id,
        },
      });
    }

    return updated;
  }

  async updateStatus(id: string, dto: UpdateTaskStatusDto, userId: string) {
    return this.update(id, { status: dto.status }, userId);
  }

  async remove(id: string, userId: string) {
    const task = await this.findOne(id, userId);

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: task.projectId, userId } },
    });

    if (!member && task.creatorId !== userId) {
      throw new ForbiddenException('Cannot delete this task');
    }

    const deleted = await this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.events.emitTaskDeleted(task.projectId, id);
    return deleted;
  }

  async getActivity(taskId: string, userId: string) {
    await this.findOne(taskId, userId);

    return this.prisma.activityLog.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Comments
  async addComment(taskId: string, content: string, userId: string) {
    await this.findOne(taskId, userId);

    return this.prisma.comment.create({
      data: { content, taskId, authorId: userId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });
  }

  async deleteComment(commentId: string, userId: string, userRole: Role) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    if (comment.authorId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('Cannot delete this comment');
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
  }

  private async assertProjectAccess(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
        members: { some: { userId } },
      },
    });

    if (!project) throw new ForbiddenException('No access to this project');
    return project;
  }

  private taskIncludes() {
    return {
      assignee: {
        select: { id: true, firstName: true, lastName: true, avatar: true },
      },
      creator: {
        select: { id: true, firstName: true, lastName: true, avatar: true },
      },
      _count: {
        select: { comments: { where: { deletedAt: null } } },
      },
    };
  }

  private normalizeDueDate(raw: string | undefined): Date | undefined {
    if (raw === undefined) return undefined;

    // Date input from UI often comes as YYYY-MM-DD (without time).
    // Store it at end-of-day UTC to avoid becoming "instantly overdue" at midnight.
    if (TasksService.DATE_ONLY_RE.test(raw)) {
      return new Date(`${raw}T23:59:59.999Z`);
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed;
  }
}
