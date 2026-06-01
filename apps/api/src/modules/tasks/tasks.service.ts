import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { ProjectRole, Role, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { EmailService } from '../mail/email.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { FilterTasksDto } from './dto/filter-tasks.dto';
import { hasProjectPermission } from '../auth/authorization/project-rbac';
import { CacheManager } from '../../shared/redis/cache.manager';
import { CacheInvalidationService } from '../../shared/redis/cache-invalidation.service';
import { CacheKeys } from '../../shared/redis/cache-keys';

@Injectable()
export class TasksService {
  private static readonly DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly cacheManager: CacheManager,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) { }

  async create(projectId: string, dto: CreateTaskDto, userId: string, userRole: Role = Role.USER) {
    await this.assertProjectAccess(projectId, userId, { requireWrite: true, userRole });

    if (userRole !== Role.ADMIN) {
      const [project, member] = await Promise.all([
        this.prisma.project.findUnique({
          where: { id: projectId },
          select: { taskCreatePermission: true },
        }),
        this.prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId, userId } },
          select: { role: true },
        }),
      ]);

      if (!this.hasRoleAtLeast(member?.role, project?.taskCreatePermission)) {
        throw new ForbiddenException('Insufficient permissions to create tasks in this project');
      }
    }

    const dueDate = this.normalizeDueDate(dto.dueDate);
    const { subtasks = [], ...taskPayload } = dto;

    const task = await this.prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          ...taskPayload,
          projectId,
          creatorId: userId,
          dueDate,
        },
      });

      if (subtasks.length > 0) {
        await tx.subtask.createMany({
          data: subtasks
            .map((subtask, index) => ({
              parentTaskId: created.id,
              title: subtask.title.trim(),
              completed: subtask.completed ?? false,
              inProgress: subtask.completed ? false : (subtask.inProgress ?? false),
              position: subtask.position ?? index,
            }))
            .filter((subtask) => subtask.title.length >= 2),
        });
      }

      return tx.task.findUniqueOrThrow({
        where: { id: created.id },
        include: this.taskIncludes(),
      });
    });

    const actor = await this.getActorSnapshot(userId);
    this.events.emitTaskCreated(projectId, task, { actor });

    const activity = await this.prisma.activityLog.create({
      data: {
        action: 'CREATED',
        entity: 'Task',
        entityId: task.id,
        newValue: { title: task.title, status: task.status, priority: task.priority },
        userId,
        projectId,
        taskId: task.id,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true, collaborationColor: true } },
      },
    });
    this.events.emitActivityCreated(projectId, activity);

    if (task.assigneeId && task.assignee) {
      const [project, actorUser] = await Promise.all([
        this.prisma.project.findUnique({
          where: { id: task.projectId },
          select: { id: true, name: true },
        }),
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true },
        }),
      ]);

      const projectName = project?.name || 'Project';
      const actorName = [actorUser?.firstName, actorUser?.lastName].filter(Boolean).join(' ').trim() || 'A teammate';
      const taskUrl = `${this.config.get<string>('FRONTEND_URL', 'http://localhost:3000')}/projects/${task.projectId}?taskId=${task.id}`;
      const prefs = this.parseNotificationPrefs((task.assignee as any).notificationPrefs);
      const assigneeAny = task.assignee as any;

      if (prefs.taskAssigned) {
        await this.prisma.notification.create({
          data: {
            userId: task.assignee.id,
            type: 'task_assigned',
            title: 'Task assigned',
            body: `${task.title} in ${projectName}`,
          },
        });
      }

      if (prefs.taskAssigned && prefs.realtimeNotifications) {
        this.events.emitToUser(task.assignee.id, 'notification', {
          type: 'task_assigned',
          i18nKey: 'notification.taskAssigned',
          i18nParams: { task: task.title, project: projectName },
          taskId: task.id,
          projectId: task.projectId,
          createdAt: new Date().toISOString(),
        });
      }

      if (prefs.taskAssigned && prefs.emailNotifications && assigneeAny?.email) {
        try {
          await this.email.sendTaskAssignedEmail({
            to: assigneeAny.email,
            userId: task.assignee.id,
            userName: task.assignee.firstName,
            assignedBy: actorName,
            projectName,
            taskTitle: task.title,
            taskUrl,
            companyName: this.config.get<string>('COMPANY_NAME', 'Our Company'),
            companyAddress: this.config.get<string>('COMPANY_ADDRESS', '123 Main St, Anytown'),
            supportEmail: this.config.get<string>('SUPPORT_EMAIL', 'support@tasku.pro'),
            year: new Date().getFullYear().toString(),
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Failed to send task_assigned email for task ${task.id}: ${msg}`);
        }
      }
    }

    await this.invalidateTaskCaches(task.id, task.projectId, task.assigneeId ?? undefined);
    return task;
  }

  async findAllByProject(projectId: string, userId: string, filters: FilterTasksDto, userRole: Role = Role.USER) {
    await this.assertProjectAccess(projectId, userId, { userRole });

    const { search, status, priority, assigneeId, page = 1, limit = 50, sortBy = 'position', order = 'asc' } = filters;
    const skip = (page - 1) * limit;
    const cacheHash = createHash('sha1').update(JSON.stringify({ userId, userRole, search, status, priority, assigneeId, page, limit, sortBy, order })).digest('hex').slice(0, 16);
    const ttl = Number(this.config.get<string>('CACHE_TTL_TASK', '90'));

    return this.cacheManager.remember({
      key: CacheKeys.projectTasks(projectId, cacheHash),
      ttlSeconds: ttl,
      loader: async () => {
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
      },
    });
  }

  async findOne(id: string, userId: string, userRole: Role = Role.USER) {
    const ttl = Number(this.config.get<string>('CACHE_TTL_TASK', '90'));
    const task = await this.cacheManager.remember({
      key: CacheKeys.task(id),
      ttlSeconds: ttl,
      loader: () => this.prisma.task.findFirst({
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
      }),
    });

    if (!task) throw new NotFoundException('Task not found');
    await this.assertProjectAccess(task.projectId, userId, { userRole });

    return task;
  }

  async update(id: string, dto: UpdateTaskDto, userId: string, userRole: Role = Role.USER) {
    const task = await this.findOne(id, userId, userRole);
    await this.assertProjectAccess(task.projectId, userId, { requireWrite: true, userRole });
    const oldValues: Record<string, any> = {};
    const changes: string[] = [];
    const dueDate = this.normalizeDueDate(dto.dueDate);

    if (dto.title !== undefined && dto.title !== task.title) {
      oldValues.title = task.title;
      changes.push('title');
    }
    if (dto.description !== undefined && dto.description !== task.description) {
      oldValues.description = task.description;
      changes.push('description');
    }

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

    const { subtasks: _ignoredSubtasks, ...dtoData } = dto;

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        ...dtoData,
        dueDate,
      },
      include: this.taskIncludes(),
    });

    const actor = await this.getActorSnapshot(userId);
    this.events.emitTaskUpdated(updated.projectId, updated, {
      actor,
      oldValue: oldValues,
      changedFields: changes,
    });

    const assigneeChanged = dto.assigneeId !== undefined && dto.assigneeId !== task.assigneeId;
    if (assigneeChanged && updated.assigneeId) {
      const [project, actor] = await Promise.all([
        this.prisma.project.findUnique({
          where: { id: updated.projectId },
          select: { id: true, name: true },
        }),
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true },
        }),
      ]);

      const projectName = project?.name || 'Project';
      const actorName = [actor?.firstName, actor?.lastName].filter(Boolean).join(' ').trim() || 'A teammate';
      const taskUrl = `${this.config.get<string>('FRONTEND_URL', 'http://localhost:3000')}/projects/${updated.projectId}?taskId=${updated.id}`;
      const isReassignment = !!task.assigneeId && task.assigneeId !== updated.assigneeId;
      const targetType = isReassignment ? 'task_reassigned' : 'task_assigned';
      const targetI18n = isReassignment ? 'notification.taskReassigned' : 'notification.taskAssigned';
      const notificationTitle = isReassignment ? 'Task reassigned' : 'Task assigned';

      if (updated.assignee) {
        const prefs = this.parseNotificationPrefs((updated.assignee as any).notificationPrefs);
        if (prefs.taskAssigned) {
          await this.prisma.notification.create({
            data: {
              userId: updated.assignee.id,
              type: targetType,
              title: notificationTitle,
              body: `${updated.title} in ${projectName}`,
            },
          });
        }

        if (prefs.taskAssigned && prefs.realtimeNotifications) {
          this.events.emitToUser(updated.assignee.id, 'notification', {
            type: targetType,
            i18nKey: targetI18n,
            i18nParams: { task: updated.title, project: projectName },
            taskId: updated.id,
            projectId: updated.projectId,
            createdAt: new Date().toISOString(),
          });
        }

        const assigneeAny = updated.assignee as any;
        if (prefs.taskAssigned && prefs.emailNotifications && assigneeAny?.email) {
          try {
            if (isReassignment) {
              await this.email.sendTaskReassignedEmail({
                to: assigneeAny.email,
                userId: updated.assignee.id,
                userName: updated.assignee.firstName,
                assignedBy: actorName,
                projectName,
                taskTitle: updated.title,
                taskUrl,
                companyName: this.config.get<string>('COMPANY_NAME', 'Our Company'),
                companyAddress: this.config.get<string>('COMPANY_ADDRESS', '123 Main St, Anytown'),
                supportEmail: this.config.get<string>('SUPPORT_EMAIL', 'support@tasku.pro'),
                year: new Date().getFullYear().toString(),
              });
            } else {
              this.logger.debug(`Sending task_assigned email to ${assigneeAny.email} for task ${updated.id}`);
              await this.email.sendTaskAssignedEmail({
                to: assigneeAny.email,
                userId: updated.assignee.id,
                userName: updated.assignee.firstName,
                assignedBy: actorName,
                projectName,
                taskTitle: updated.title,
                taskUrl,
                companyName: this.config.get<string>('COMPANY_NAME', 'Our Company'),
                companyAddress: this.config.get<string>('COMPANY_ADDRESS', '123 Main St, Anytown'),
                supportEmail: this.config.get<string>('SUPPORT_EMAIL', 'support@tasku.pro'),
                year: new Date().getFullYear().toString(),
              });
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Failed to send ${targetType} email for task ${updated.id}: ${msg}`);
          }
        } else {
          this.logger.debug(`Not sending ${targetType} email for task ${updated.id} due to user preferences or missing email`);
        }

        if (isReassignment) {
          const reassignedActivity = await this.prisma.activityLog.create({
            data: {
              action: 'REASSIGNED',
              entity: 'Task',
              entityId: updated.id,
              oldValue: { assigneeId: task.assigneeId },
              newValue: { assigneeId: updated.assigneeId },
              userId,
              projectId: updated.projectId,
              taskId: updated.id,
            },
            include: {
              user: { select: { id: true, firstName: true, lastName: true, avatar: true, collaborationColor: true } },
            },
          });
          this.events.emitActivityCreated(updated.projectId, reassignedActivity);
        }

        if (isReassignment && task.assigneeId && task.assigneeId !== updated.assigneeId) {
          this.events.emitToUser(task.assigneeId, 'notification', {
            type: 'task_unassigned',
            i18nKey: 'notification.taskUnassigned',
            i18nParams: { task: updated.title, project: projectName },
            taskId: updated.id,
            projectId: updated.projectId,
            createdAt: new Date().toISOString(),
          });
          await this.prisma.notification.create({
            data: {
              userId: task.assigneeId,
              type: 'task_unassigned',
              title: 'Task reassigned',
              body: `${updated.title} was reassigned in ${projectName}`,
            },
          });
        }
      }
    }

    // Audit log
    if (changes.length > 0) {
      const activity = await this.prisma.activityLog.create({
        data: {
          action: 'UPDATED',
          entity: 'Task',
          entityId: id,
          oldValue: oldValues,
          newValue: changes.reduce((acc, key) => ({ ...acc, [key]: (updated as any)[key] }), {}),
          userId,
          projectId: task.projectId,
          taskId: id,
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatar: true, collaborationColor: true } },
        },
      });
      this.events.emitActivityCreated(task.projectId, activity);
    }

    await this.invalidateTaskCaches(updated.id, updated.projectId, updated.assigneeId ?? undefined);
    return updated;
  }

  async updateStatus(id: string, dto: UpdateTaskStatusDto, userId: string, userRole: Role = Role.USER) {
    return this.update(id, { status: dto.status }, userId, userRole);
  }

  async remove(id: string, userId: string, userRole: Role = Role.USER) {
    const task = await this.findOne(id, userId, userRole);
    await this.assertProjectAccess(task.projectId, userId, { requireWrite: true, userRole });

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

    const actor = await this.getActorSnapshot(userId);
    this.events.emitTaskDeleted(task.projectId, id, {
      actor,
      task: { id: task.id, title: task.title, status: task.status, priority: task.priority },
    });

    const activity = await this.prisma.activityLog.create({
      data: {
        action: 'DELETED',
        entity: 'Task',
        entityId: id,
        oldValue: { title: task.title, status: task.status, priority: task.priority },
        userId,
        projectId: task.projectId,
        taskId: id,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true, collaborationColor: true } },
      },
    });
    this.events.emitActivityCreated(task.projectId, activity);
    await this.invalidateTaskCaches(task.id, task.projectId, task.assigneeId ?? undefined);
    return deleted;
  }

  async getActivity(taskId: string, userId: string, userRole: Role = Role.USER, limit = 100) {
    await this.findOne(taskId, userId, userRole);

    const take = Math.min(Math.max(limit || 50, 1), 300);
    const ttl = Number(this.config.get<string>('CACHE_TTL_ACTIVITY', '30'));
    return this.cacheManager.remember({
      key: CacheKeys.taskActivity(taskId, take),
      ttlSeconds: ttl,
      loader: () => this.prisma.activityLog.findMany({
        where: { taskId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
      }),
    });
  }

  // Comments
  async addComment(taskId: string, content: string, userId: string, userRole: Role = Role.USER) {
    const task = await this.findOne(taskId, userId, userRole);
    await this.assertProjectAccess(task.projectId, userId, { requireWrite: true, userRole });

    const comment = await this.prisma.comment.create({
      data: { content, taskId, authorId: userId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });

    const activity = await this.prisma.activityLog.create({
      data: {
        action: 'COMMENT_ADDED',
        entity: 'Comment',
        entityId: comment.id,
        newValue: { content: comment.content },
        userId,
        projectId: task.projectId,
        taskId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true, collaborationColor: true } },
      },
    });
    this.events.emitActivityCreated(task.projectId, activity);

    const updatedTask = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: this.taskIncludes(),
    });
    const actor = await this.getActorSnapshot(userId);
    this.events.emitTaskUpdated(task.projectId, updatedTask, {
      actor,
      changedFields: ['comments'],
    });

    await this.invalidateTaskCaches(taskId, task.projectId, task.assigneeId ?? undefined);
    return comment;
  }

  async deleteComment(commentId: string, userId: string, userRole: Role) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    if (comment.authorId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('Cannot delete this comment');
    }

    const deleted = await this.prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    const relatedTask = await this.prisma.task.findFirst({ where: { comments: { some: { id: commentId } } }, select: { id: true, projectId: true, assigneeId: true } });
    if (relatedTask) {
      await this.invalidateTaskCaches(relatedTask.id, relatedTask.projectId, relatedTask.assigneeId ?? undefined);
    }
    return deleted;
  }

  async addSubtask(taskId: string, payload: CreateSubtaskDto, userId: string, userRole: Role = Role.USER) {
    const task = await this.findOne(taskId, userId, userRole);
    await this.assertProjectAccess(task.projectId, userId, { requireWrite: true, userRole });
    const existingCount = await this.prisma.subtask.count({ where: { parentTaskId: taskId } });
    const completed = payload.completed ?? false;
    const inProgress = completed ? false : (payload.inProgress ?? false);

    const subtask = await this.prisma.subtask.create({
      data: {
        parentTaskId: taskId,
        title: payload.title.trim(),
        completed,
        inProgress,
        position: existingCount,
      },
    });

    const activity = await this.prisma.activityLog.create({
      data: {
        action: 'SUBTASK_CREATED',
        entity: 'Subtask',
        entityId: subtask.id,
        newValue: {
          title: subtask.title,
          completed: subtask.completed,
          inProgress: subtask.inProgress,
          position: subtask.position,
        },
        userId,
        projectId: task.projectId,
        taskId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true, collaborationColor: true } },
      },
    });
    this.events.emitActivityCreated(task.projectId, activity);

    const updatedTask = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: this.taskIncludes(),
    });

    const actor = await this.getActorSnapshot(userId);
    this.events.emitTaskUpdated(task.projectId, updatedTask, {
      actor,
      changedFields: ['subtasks'],
    });
    await this.invalidateTaskCaches(taskId, task.projectId, task.assigneeId ?? undefined);
    return subtask;
  }

  async updateSubtask(taskId: string, subtaskId: string, data: { title?: string; completed?: boolean; inProgress?: boolean; position?: number }, userId: string, userRole: Role = Role.USER) {
    const task = await this.findOne(taskId, userId, userRole);
    await this.assertProjectAccess(task.projectId, userId, { requireWrite: true, userRole });

    const subtask = await this.prisma.subtask.findFirst({
      where: { id: subtaskId, parentTaskId: taskId },
    });

    if (!subtask) throw new NotFoundException('Subtask not found');

    const normalizedCompleted = data.completed;
    const normalizedInProgress = data.inProgress;
    const nextCompleted = normalizedCompleted !== undefined
      ? normalizedCompleted
      : (normalizedInProgress ? false : undefined);
    const nextInProgress = normalizedInProgress !== undefined
      ? normalizedInProgress
      : (normalizedCompleted ? false : undefined);

    const updated = await this.prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(nextCompleted !== undefined && { completed: nextCompleted }),
        ...(nextInProgress !== undefined && { inProgress: nextInProgress }),
        ...(data.position !== undefined && { position: data.position }),
      },
    });

    const activity = await this.prisma.activityLog.create({
      data: {
        action: 'SUBTASK_UPDATED',
        entity: 'Subtask',
        entityId: subtaskId,
        oldValue: {
          title: subtask.title,
          completed: subtask.completed,
          inProgress: (subtask as any).inProgress ?? false,
          position: subtask.position,
        },
        newValue: {
          title: updated.title,
          completed: updated.completed,
          inProgress: (updated as any).inProgress ?? false,
          position: updated.position,
        },
        userId,
        projectId: task.projectId,
        taskId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true, collaborationColor: true } },
      },
    });
    this.events.emitActivityCreated(task.projectId, activity);

    const updatedTask = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: this.taskIncludes(),
    });
    const actor = await this.getActorSnapshot(userId);
    this.events.emitTaskUpdated(task.projectId, updatedTask, {
      actor,
      changedFields: ['subtasks'],
    });

    await this.invalidateTaskCaches(taskId, task.projectId, task.assigneeId ?? undefined);
    return updated;
  }

  async removeSubtask(taskId: string, subtaskId: string, userId: string, userRole: Role = Role.USER) {
    const task = await this.findOne(taskId, userId, userRole);
    await this.assertProjectAccess(task.projectId, userId, { requireWrite: true, userRole });

    const subtask = await this.prisma.subtask.findFirst({
      where: { id: subtaskId, parentTaskId: taskId },
    });

    if (!subtask) throw new NotFoundException('Subtask not found');

    await this.prisma.subtask.delete({ where: { id: subtaskId } });

    const activity = await this.prisma.activityLog.create({
      data: {
        action: 'SUBTASK_DELETED',
        entity: 'Subtask',
        entityId: subtaskId,
        oldValue: { title: subtask.title, position: subtask.position },
        userId,
        projectId: task.projectId,
        taskId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true, collaborationColor: true } },
      },
    });
    this.events.emitActivityCreated(task.projectId, activity);

    const rest = await this.prisma.subtask.findMany({
      where: { parentTaskId: taskId },
      orderBy: { position: 'asc' },
      select: { id: true },
    });

    await this.prisma.$transaction(
      rest.map((item, index) =>
        this.prisma.subtask.update({
          where: { id: item.id },
          data: { position: index },
        }),
      ),
    );

    const updatedTask = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: this.taskIncludes(),
    });
    const actor = await this.getActorSnapshot(userId);
    this.events.emitTaskUpdated(task.projectId, updatedTask, {
      actor,
      changedFields: ['subtasks'],
    });

    await this.invalidateTaskCaches(taskId, task.projectId, task.assigneeId ?? undefined);
    return { id: subtaskId };
  }

  async reorderSubtasks(taskId: string, orderedIds: string[], userId: string, userRole: Role = Role.USER) {
    const task = await this.findOne(taskId, userId, userRole);
    await this.assertProjectAccess(task.projectId, userId, { requireWrite: true, userRole });

    const subtasks = await this.prisma.subtask.findMany({
      where: { parentTaskId: taskId },
      select: { id: true },
    });

    if (subtasks.length !== orderedIds.length) {
      throw new BadRequestException('Invalid subtask order payload');
    }

    const validIds = new Set(subtasks.map((subtask) => subtask.id));
    if (orderedIds.some((id) => !validIds.has(id))) {
      throw new BadRequestException('Invalid subtask ids in reorder payload');
    }

    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.subtask.update({
          where: { id },
          data: { position: index },
        }),
      ),
    );

    const activity = await this.prisma.activityLog.create({
      data: {
        action: 'SUBTASK_REORDERED',
        entity: 'Subtask',
        entityId: taskId,
        newValue: { orderedIds },
        userId,
        projectId: task.projectId,
        taskId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true, collaborationColor: true } },
      },
    });
    this.events.emitActivityCreated(task.projectId, activity);

    const updatedTask = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: this.taskIncludes(),
    });
    const actor = await this.getActorSnapshot(userId);
    this.events.emitTaskUpdated(task.projectId, updatedTask, {
      actor,
      changedFields: ['subtasks'],
    });

    await this.invalidateTaskCaches(taskId, task.projectId, task.assigneeId ?? undefined);
    return updatedTask.subtasks;
  }

  private async assertProjectAccess(
    projectId: string,
    userId: string,
    options?: { requireWrite?: boolean; userRole?: Role },
  ) {
    const requireWrite = options?.requireWrite ?? false;
    const userRole = options?.userRole ?? Role.USER;

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true },
    });

    if (!project) throw new ForbiddenException('No access to this project');

    if (userRole === Role.ADMIN) return project;

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });

    if (!member || !hasProjectPermission(member.role, 'project.read', userRole)) {
      throw new ForbiddenException('No access to this project');
    }

    if (requireWrite && !hasProjectPermission(member.role, 'task.write', userRole)) {
      throw new ForbiddenException('Insufficient task permissions');
    }

    return project;
  }

  private taskIncludes() {
    return {
      assignee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          email: true,
          collaborationColor: true,
          notificationPrefs: true,
        },
      },
      creator: {
        select: { id: true, firstName: true, lastName: true, avatar: true, collaborationColor: true },
      },
      subtasks: {
        orderBy: { position: 'asc' as const },
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

  private parseNotificationPrefs(raw: unknown) {
    const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    return {
      taskAssigned: src.taskAssigned !== false,
      taskDue: src.taskDue !== false,
      taskDue1h: src.taskDue1h === true,
      projectUpdates: src.projectUpdates !== false,
      weekly: src.weekly !== false,
      emailNotifications: src.emailNotifications !== false,
      realtimeNotifications: src.realtimeNotifications !== false,
    };
  }

  private hasRoleAtLeast(actorRole: ProjectRole | null | undefined, requiredRole: ProjectRole | null | undefined) {
    if (!actorRole || !requiredRole) return false;
    const rank: Record<ProjectRole, number> = {
      OWNER: 4,
      ADMIN: 3,
      MEMBER: 2,
      VIEWER: 1,
    };
    return rank[actorRole] >= rank[requiredRole];
  }

  private async getActorSnapshot(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        collaborationColor: true,
      },
    });
  }

  private async invalidateTaskCaches(taskId: string, projectId: string, assigneeId?: string) {
    await this.cacheInvalidation.invalidateTask(taskId, projectId);
    await this.cacheInvalidation.invalidateProject(projectId);
    await this.cacheInvalidation.invalidateDashboard();
    if (assigneeId) {
      await this.cacheInvalidation.invalidateNotifications(assigneeId);
      await this.cacheInvalidation.invalidateUser(assigneeId);
    }
  }
}
