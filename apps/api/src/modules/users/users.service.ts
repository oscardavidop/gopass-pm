import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
}
