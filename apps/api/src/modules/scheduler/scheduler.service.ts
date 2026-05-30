import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../shared/database/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { EmailService } from '../mail/email.service';
import { TaskStatus } from '@prisma/client';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly config: ConfigService,
    private readonly email: EmailService,
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
        assignee: { select: { id: true, notificationPrefs: true } },
        creator: { select: { id: true, notificationPrefs: true } },
      },
    });

    for (const task of overdueTasks) {
      const targetUserId = task.assigneeId ?? task.creatorId;
      const targetUser = task.assignee ?? task.creator;
      const prefs = this.parseNotificationPrefs((targetUser as any)?.notificationPrefs);
      if (!prefs.taskDue || !prefs.realtimeNotifications) continue;
      this.events.emitToUser(targetUserId, 'notification', {
        type: 'task_overdue',
        i18nKey: 'notification.taskOverdue',
        i18nParams: { task: task.title, project: task.project.name },
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
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    const in0h = now;

    const upcomingTasks24h = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        status: { notIn: [TaskStatus.DONE] },
        // 1h window around the 24h mark (23h-24h before due date)
        dueDate: { gte: in23h, lte: in24h },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, email: true, firstName: true } },
        creator: { select: { id: true, email: true, firstName: true } },
      },
    });

    const upcomingTasks1h = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        status: { notIn: [TaskStatus.DONE] },
        dueDate: { gte: in0h, lte: in1h },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, email: true, firstName: true, notificationPrefs: true } },
        creator: { select: { id: true, email: true, firstName: true, notificationPrefs: true } },
      },
    });

    const dueReminders = [
      ...upcomingTasks24h.map((task) => ({ task, window: '24h' as const })),
      ...upcomingTasks1h.map((task) => ({ task, window: '1h' as const })),
    ];

    for (const entry of dueReminders) {
      const task = entry.task;
      const targetUserId = task.assigneeId ?? task.creatorId;
      const targetUser = task.assignee ?? task.creator;
      const prefs = this.parseNotificationPrefs((targetUser as any)?.notificationPrefs);
      const shouldSendDue = entry.window === '24h' ? prefs.taskDue : prefs.taskDue && prefs.taskDue1h;
      if (!shouldSendDue) continue;

      await this.prisma.notification.create({
        data: {
          userId: targetUserId,
          type: 'task_due_reminder',
          title: 'Task due reminder',
          body: `${task.title} in ${task.project.name} (${entry.window})`,
        },
      });

      if (prefs.realtimeNotifications) {
        this.events.emitToUser(targetUserId, 'notification', {
          type: 'task_due_reminder',
          i18nKey: 'notification.taskDueReminder',
          i18nParams: { task: task.title, project: task.project.name, window: entry.window },
          taskId: task.id,
          projectId: task.projectId,
          createdAt: new Date().toISOString(),
        });
      }

      if (prefs.emailNotifications && targetUser?.email && task.dueDate) {
        const taskUrl = `${this.config.get<string>('FRONTEND_URL', 'http://localhost:3000')}/projects/${task.projectId}?taskId=${task.id}`;
        try {
          await this.email.sendTaskReminderEmail({
            to: targetUser.email,
            userId: targetUser.id,
            userName: targetUser.firstName,
            projectName: task.project.name,
            taskTitle: task.title,
            dueDate: task.dueDate.toISOString(),
            taskUrl,
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Due reminder email failed for task ${task.id}: ${msg}`);
        }
      }

      this.logger.log(`Due reminder sent (${entry.window}): task ${task.id} → user ${targetUserId}`);
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
      select: { id: true, email: true, firstName: true, notificationPrefs: true },
    });

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const user of users) {
      const prefs = this.parseNotificationPrefs((user as any).notificationPrefs);
      if (!prefs.weekly) continue;

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

      await this.prisma.notification.create({
        data: {
          userId: user.id,
          type: 'weekly_digest',
          title: 'Weekly digest',
          body: `${tasksCompleted} completed · ${tasksCreated} created · ${tasksOverdue} overdue`,
        },
      });

      if (prefs.realtimeNotifications) {
        this.events.emitToUser(user.id, 'notification', {
          type: 'weekly_digest',
          i18nKey: 'notification.weeklyDigest',
          i18nParams: {
            created: tasksCreated,
            completed: tasksCompleted,
            overdue: tasksOverdue,
          },
          createdAt: new Date().toISOString(),
        });
      }

      if (prefs.emailNotifications && user.email) {
        const dashboardUrl = `${this.config.get<string>('FRONTEND_URL', 'http://localhost:3000')}/dashboard`;
        try {
          await this.email.sendWeeklyDigestEmail({
            to: user.email,
            userId: user.id,
            userName: user.firstName,
            periodLabel: 'Last 7 days',
            tasksCreated,
            tasksCompleted,
            tasksOverdue,
            dashboardUrl,
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Weekly digest email failed for user ${user.id}: ${msg}`);
        }
      }
    }

    this.logger.log(`Weekly digest sent to ${users.length} users`);
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
}
