import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from '../../shared/database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { CacheManager } from '../../shared/redis/cache.manager';
import { CacheInvalidationService } from '../../shared/redis/cache-invalidation.service';
import { CacheKeys } from '../../shared/redis/cache-keys';

const USER_SELECT = {
  id: true,
  email: true,
  username: true,
  firstName: true,
  lastName: true,
  avatar: true,
  bio: true,
  role: true,
  isActive: true,
  notificationPrefs: true,
  createdAt: true,
  updatedAt: true,
} as const;

const USER_PUBLIC_SELECT = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  avatar: true,
  bio: true,
  collaborationColor: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly cacheManager: CacheManager,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  async findById(id: string) {
    const ttl = Number(this.config.get<string>('CACHE_TTL_USER', '300'));
    return this.cacheManager.remember({
      key: CacheKeys.userPublic(id),
      ttlSeconds: ttl,
      loader: async () => {
        const user = await this.prisma.user.findFirst({
          where: { id, deletedAt: null },
          select: USER_SELECT,
        });
        if (!user) throw new NotFoundException('User not found');
        return user;
      },
    });
  }

  async findAll(search?: string, limit = 50) {
    const safeLimit = Math.min(Math.max(limit || 50, 1), 200);
    const queryHash = createHash('sha1').update(`${search ?? ''}:${safeLimit}`).digest('hex').slice(0, 16);

    return this.cacheManager.remember({
      key: CacheKeys.searchUsers(queryHash),
      ttlSeconds: 30,
      loader: () => this.prisma.user.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          ...(search && {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
            ],
          }),
        },
        select: USER_PUBLIC_SELECT,
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
      }),
    });
  }

  async findPublicById(id: string) {
    const ttl = Number(this.config.get<string>('CACHE_TTL_USER', '300'));
    return this.cacheManager.remember({
      key: CacheKeys.user(id),
      ttlSeconds: ttl,
      loader: async () => {
        const user = await this.prisma.user.findFirst({
          where: { id, deletedAt: null, isActive: true },
          select: USER_PUBLIC_SELECT,
        });
        if (!user) throw new NotFoundException('User not found');
        return user;
      },
    });
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    await this.findById(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    });

    await this.cacheInvalidation.invalidateUser(id);
    return updated;
  }

  async getNotificationPreferences(id: string) {
    const ttl = Number(this.config.get<string>('CACHE_TTL_USER', '300'));
    return this.cacheManager.remember({
      key: CacheKeys.userPreferences(id),
      ttlSeconds: ttl,
      loader: async () => {
        const user = await this.prisma.user.findFirst({
          where: { id, deletedAt: null },
          select: { notificationPrefs: true },
        });
        if (!user) throw new NotFoundException('User not found');
        return this.withDefaults(user.notificationPrefs);
      },
    });
  }

  async updateNotificationPreferences(id: string, dto: UpdateNotificationPreferencesDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { notificationPrefs: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const next = {
      ...this.withDefaults(user.notificationPrefs),
      ...dto,
    };

    await this.prisma.user.update({
      where: { id },
      data: { notificationPrefs: next as any },
    });

    await this.cacheInvalidation.invalidateUser(id);
    return next;
  }

  private withDefaults(raw: unknown) {
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
