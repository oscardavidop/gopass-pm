import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FilterProjectsDto } from './dto/filter-projects.dto';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async create(dto: CreateProjectDto, userId: string) {
    return this.prisma.project.create({
      data: {
        ...dto,
        ownerId: userId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
      include: this.projectIncludes(),
    });
  }

  async findAll(userId: string, userRole: Role, filters: FilterProjectsDto) {
    const { search, status, page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      ...(userRole !== Role.ADMIN && {
        members: { some: { userId } },
      }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        include: this.projectIncludes(),
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, userId: string, userRole: Role) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: this.projectIncludes(),
    });

    if (!project) throw new NotFoundException('Project not found');

    const isMember = project.members.some((m) => m.userId === userId);
    if (userRole !== Role.ADMIN && !isMember) {
      throw new ForbiddenException('Access denied to this project');
    }

    return project;
  }

  async update(id: string, dto: UpdateProjectDto, userId: string, userRole: Role) {
    const project = await this.findOne(id, userId, userRole);

    const member = project.members.find((m) => m.userId === userId);
    if (
      userRole !== Role.ADMIN &&
      member?.role !== 'OWNER' &&
      member?.role !== 'ADMIN'
    ) {
      throw new ForbiddenException('Only project admins can update the project');
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: this.projectIncludes(),
    });
  }

  async remove(id: string, userId: string, userRole: Role) {
    const project = await this.findOne(id, userId, userRole);

    if (userRole !== Role.ADMIN && project.ownerId !== userId) {
      throw new ForbiddenException('Only project owner can delete the project');
    }

    return this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async addMember(projectId: string, memberId: string, currentUserId: string, userRole: Role) {
    const project = await this.findOne(projectId, currentUserId, userRole);
    const member = project.members.find((m) => m.userId === currentUserId);

    if (userRole !== Role.ADMIN && member?.role !== 'OWNER' && member?.role !== 'ADMIN') {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Fetch the new member's user data so we can broadcast their info
    const newMemberUser = await this.prisma.user.findUnique({
      where: { id: memberId },
      select: { id: true, firstName: true, lastName: true, avatar: true, email: true },
    });

    const result = await this.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: memberId } },
      create: { projectId, userId: memberId },
      update: {},
    });

    const adder = project.members.find((m) => m.userId === currentUserId);
    const actorName = adder?.user
      ? `${(adder.user as any).firstName} ${(adder.user as any).lastName}`.trim()
      : 'A team member';

    // 1. Notify all existing project members so they refresh the member list
    this.events.emitMemberAdded(projectId, {
      projectId,
      userId: memberId,
      user: newMemberUser,
    });

    // 2. Notify the newly added member privately
    this.events.emitToUser(memberId, 'notification', {
      type: 'project_updated',
      title: 'You were added to a project',
      body: `You have been added to "${project.name}"`,
      projectId,
      actorName,
    });

    return result;
  }

  async removeMember(projectId: string, memberId: string, currentUserId: string, userRole: Role) {
    const project = await this.findOne(projectId, currentUserId, userRole);
    const member = project.members.find((m) => m.userId === currentUserId);

    if (userRole !== Role.ADMIN && member?.role !== 'OWNER') {
      throw new ForbiddenException('Only project owner can remove members');
    }

    const targetMember = project.members.find((m) => m.userId === memberId);
    if (!targetMember) throw new NotFoundException('Member not found in this project');
    if (targetMember.role === 'OWNER') throw new ForbiddenException('Cannot remove project owner');

    const result = await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: memberId } },
    });

    // Broadcast removal to all members + force-remove the kicked user from the WS room
    this.events.emitMemberRemoved(projectId, memberId, { projectId, userId: memberId });

    return result;
  }

  private projectIncludes() {
    return {
      owner: {
        select: { id: true, firstName: true, lastName: true, avatar: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true, email: true },
          },
        },
      },
      _count: { select: { tasks: { where: { deletedAt: null } }, members: true } },
    };
  }
}
