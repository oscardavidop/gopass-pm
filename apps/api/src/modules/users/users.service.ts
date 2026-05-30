import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

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

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll(search?: string) {
    return this.prisma.user.findMany({
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
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    });
  }

  async getNotificationPreferences(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { notificationPrefs: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.withDefaults(user.notificationPrefs);
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
