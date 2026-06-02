import { Injectable } from '@nestjs/common';

import { CacheService } from './cache.service';
import { CacheKeys, CACHE_KEY_PREFIX } from './cache-keys';

@Injectable()
export class CacheInvalidationService {
  constructor(private readonly cacheService: CacheService) {}

  async invalidateUser(userId: string) {
    await this.cacheService.del(
      CacheKeys.user(userId),
      CacheKeys.userPublic(userId),
      CacheKeys.userPreferences(userId),
      CacheKeys.userSettings(userId),
      CacheKeys.userPermissions(userId),
    );
    await this.cacheService.delByPattern(`${CACHE_KEY_PREFIX}:search:users:*`);
  }

  async invalidateProject(projectId: string, userId?: string) {
    await this.cacheService.del(
      CacheKeys.project(projectId),
      CacheKeys.projectMembers(projectId),
      CacheKeys.projectStats(projectId),
      CacheKeys.projectOverview(projectId),
    );
    await this.cacheService.delByPattern(`${CACHE_KEY_PREFIX}:search:${userId ? userId : '*' }:projects:*`);
    await this.cacheService.delByPattern(`${CACHE_KEY_PREFIX}:project:${projectId}:activity:*`);
    await this.cacheService.delByPattern(`${CACHE_KEY_PREFIX}:project:${projectId}:tasks:*`);
    await this.cacheService.delByPattern(`${CACHE_KEY_PREFIX}:dashboard:*`);
  }

  async invalidateTask(taskId: string, projectId?: string) {
    await this.cacheService.del(
      CacheKeys.task(taskId),
      CacheKeys.taskSubtasks(taskId),
      CacheKeys.taskAssignees(taskId),
      CacheKeys.taskAttachments(taskId),
    );
    await this.cacheService.delByPattern(`${CACHE_KEY_PREFIX}:task:${taskId}:activity:*`);

    if (projectId) {
      await this.cacheService.delByPattern(`${CACHE_KEY_PREFIX}:project:${projectId}:tasks:*`);
      await this.cacheService.delByPattern(`${CACHE_KEY_PREFIX}:project:${projectId}:activity:*`);
      await this.cacheService.del(CacheKeys.projectStats(projectId), CacheKeys.projectOverview(projectId));
    }

    await this.cacheService.delByPattern(`${CACHE_KEY_PREFIX}:dashboard:*`);
  }

  async invalidateDashboard(userId?: string, role?: string) {
    if (userId && role) {
      await this.cacheService.del(
        CacheKeys.dashboardOverview(userId, role),
        CacheKeys.dashboardMetrics(userId, role),
        CacheKeys.dashboardTimeline(userId, role),
      );
      await this.cacheService.delByPattern(`${CACHE_KEY_PREFIX}:dashboard:${userId}:${role}:activity:*`);
      return;
    }

    await this.cacheService.delByPattern(`${CACHE_KEY_PREFIX}:dashboard:*`);
  }

  async invalidateNotifications(userId: string) {
    await this.cacheService.del(
      CacheKeys.notificationUnread(userId),
      CacheKeys.notificationRecent(userId, 20),
      CacheKeys.notificationRecent(userId, 50),
    );
  }

  async invalidateApiKey(hashOrPrefix: string) {
    if (hashOrPrefix === 'all') {
      await this.cacheService.delByPattern(`${CACHE_KEY_PREFIX}:apikey:*`);
      return;
    }

    await this.cacheService.del(
      CacheKeys.apiKey(hashOrPrefix),
      CacheKeys.apiKeyPermissions(hashOrPrefix),
      CacheKeys.apiKeyOwner(hashOrPrefix),
    );
  }

  async invalidateSession(sessionId: string, userId?: string) {
    const keys: string[] = [];
    if (sessionId !== 'all') keys.push(CacheKeys.session(sessionId));
    if (userId) {
      keys.push(CacheKeys.userSessions(userId));
      await this.cacheService.delByPattern(`${CACHE_KEY_PREFIX}:session:*`);
    }
    if (keys.length) {
      await this.cacheService.del(...keys);
    }
  }
}
