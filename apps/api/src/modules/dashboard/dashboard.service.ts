import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { TaskStatus, Priority, ProjectStatus, Role } from '@prisma/client';

type GroupCount = true | { _all?: number } | undefined;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(userId: string, userRole: Role) {
    const projectWhere = userRole === Role.ADMIN
      ? { deletedAt: null }
      : { deletedAt: null, members: { some: { userId } } };

    const taskWhere = userRole === Role.ADMIN
      ? { deletedAt: null }
      : { deletedAt: null, project: { members: { some: { userId } } } };

    const [
      totalProjects,
      activeProjects,
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      overdueTasks,
      myTasks,
    ] = await this.prisma.$transaction([
      this.prisma.project.count({ where: projectWhere }),
      this.prisma.project.count({ where: { ...projectWhere, status: ProjectStatus.ACTIVE } }),
      this.prisma.task.count({ where: taskWhere }),
      this.prisma.task.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        where: taskWhere,
        _count: { _all: true },
      }),
      this.prisma.task.groupBy({
        by: ['priority'],
        orderBy: { priority: 'asc' },
        where: taskWhere,
        _count: { _all: true },
      }),
      this.prisma.task.count({
        where: {
          ...taskWhere,
          dueDate: { lt: new Date() },
          status: { notIn: [TaskStatus.DONE] },
        },
      }),
      this.prisma.task.count({
        where: { ...taskWhere, assigneeId: userId },
      }),
    ]);

    const doneGroup = tasksByStatus.find((s) => s.status === TaskStatus.DONE);
    const done = this.groupCount(doneGroup?._count);
    const completionRate = totalTasks > 0 ? Math.round((done / totalTasks) * 100) : 0;

    return {
      projects: {
        total: totalProjects,
        active: activeProjects,
      },
      tasks: {
        total: totalTasks,
        done,
        overdue: overdueTasks,
        assignedToMe: myTasks,
        completionRate,
        byStatus: this.pivotByStatus(tasksByStatus),
        byPriority: this.pivotByPriority(tasksByPriority),
      },
    };
  }

  async getProjectsOverview(userId: string, userRole: Role) {
    const where = userRole === Role.ADMIN
      ? { deletedAt: null }
      : { deletedAt: null, members: { some: { userId } } };

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        _count: {
          select: {
            tasks: { where: { deletedAt: null } },
          },
        },
        tasks: {
          where: { deletedAt: null },
          select: { status: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      status: p.status,
      totalTasks: p._count.tasks,
      doneTasks: p.tasks.filter((t) => t.status === TaskStatus.DONE).length,
      progress:
        p._count.tasks > 0
          ? Math.round((p.tasks.filter((t) => t.status === TaskStatus.DONE).length / p._count.tasks) * 100)
          : 0,
    }));
  }

  async getRecentActivity(userId: string, userRole: Role, limit = 20) {
    const where = userRole === Role.ADMIN
      ? {}
      : {
          OR: [
            { userId },
            { task: { project: { members: { some: { userId } } } } },
          ],
        };

    return this.prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getTasksTimeline(userId: string, userRole: Role) {
    const taskWhere = userRole === Role.ADMIN
      ? { deletedAt: null }
      : { deletedAt: null, project: { members: { some: { userId } } } };

    // Tasks created in last 30 days, grouped by day
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tasks = await this.prisma.task.findMany({
      where: { ...taskWhere, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const grouped: Record<string, { created: number; done: number }> = {};
    for (const task of tasks) {
      const date = task.createdAt.toISOString().split('T')[0];
      if (!grouped[date]) grouped[date] = { created: 0, done: 0 };
      grouped[date].created++;
      if (task.status === TaskStatus.DONE) grouped[date].done++;
    }

    return Object.entries(grouped).map(([date, counts]) => ({ date, ...counts }));
  }

  private pivotByStatus(groups: Array<{ status: TaskStatus; _count: GroupCount }>) {
    const result: Record<string, number> = {};
    for (const g of groups) result[g.status] = this.groupCount(g._count);
    return result;
  }

  private pivotByPriority(groups: Array<{ priority: Priority; _count: GroupCount }>) {
    const result: Record<string, number> = {};
    for (const g of groups) result[g.priority] = this.groupCount(g._count);
    return result;
  }

  private groupCount(value: GroupCount): number {
    if (!value || value === true) return 0;
    return value._all ?? 0;
  }
}
