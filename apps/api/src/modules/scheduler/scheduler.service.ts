import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../shared/database/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { TaskStatus } from '@prisma/client';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  /**
   * Every hour: find tasks that just became overdue (within last hour)
    * and notify the assignee (or fallback to the creator) via WebSocket.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueTasks() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const overdueTasks = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        status: { notIn: [TaskStatus.DONE] },
        dueDate: { gte: oneHourAgo, lte: now },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    for (const task of overdueTasks) {
      const targetUserId = task.assigneeId ?? task.creatorId;
      this.events.emitToUser(targetUserId, 'notification', {
        type: 'task_overdue',
        title: 'Task overdue',
        message: `"${task.title}" is now overdue in ${task.project.name}`,
        taskId: task.id,
        projectId: task.projectId,
        createdAt: new Date().toISOString(),
      });
      this.logger.log(`Overdue notification sent: task ${task.id} → user ${targetUserId}`);
    }
  }

  /**
    * Every hour: remind users about tasks due within the next 24 hours.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendDueReminders() {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);

    const upcomingTasks = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        status: { notIn: [TaskStatus.DONE] },
        // 1h window around the 24h mark (23h-24h before due date)
        dueDate: { gte: in23h, lte: in24h },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    for (const task of upcomingTasks) {
      const targetUserId = task.assigneeId ?? task.creatorId;
      this.events.emitToUser(targetUserId, 'notification', {
        type: 'task_due_reminder',
        title: 'Task due soon',
        message: `"${task.title}" is due in 24 hours in ${task.project.name}`,
        taskId: task.id,
        projectId: task.projectId,
        createdAt: new Date().toISOString(),
      });
      this.logger.log(`Due reminder sent: task ${task.id} → user ${targetUserId}`);
    }
  }

  /**
   * Every Monday at 9am: send a weekly digest to all active users.
   * Uses a cron expression directly since there's no EVERY_WEEK_ON_MONDAY constant.
   */
  @Cron('0 9 * * 1')
  async sendWeeklyDigest() {
    const users = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true },
    });

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const user of users) {
      const [tasksCompleted, tasksOverdue, tasksCreated] = await Promise.all([
        this.prisma.task.count({
          where: {
            deletedAt: null,
            status: TaskStatus.DONE,
            updatedAt: { gte: oneWeekAgo },
            project: { members: { some: { userId: user.id } } },
          },
        }),
        this.prisma.task.count({
          where: {
            deletedAt: null,
            status: { notIn: [TaskStatus.DONE] },
            dueDate: { lt: now },
            project: { members: { some: { userId: user.id } } },
          },
        }),
        this.prisma.task.count({
          where: {
            deletedAt: null,
            createdAt: { gte: oneWeekAgo },
            project: { members: { some: { userId: user.id } } },
          },
        }),
      ]);

      if (tasksCompleted === 0 && tasksOverdue === 0 && tasksCreated === 0) continue;

      this.events.emitToUser(user.id, 'notification', {
        type: 'weekly_digest',
        title: 'Weekly digest',
        message: `This week: ${tasksCreated} created, ${tasksCompleted} completed, ${tasksOverdue} overdue`,
        createdAt: new Date().toISOString(),
      });
    }

    this.logger.log(`Weekly digest sent to ${users.length} users`);
  }
}
