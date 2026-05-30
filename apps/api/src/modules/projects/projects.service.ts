import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ProjectInvitationStatus, ProjectRole, Role } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FilterProjectsDto } from './dto/filter-projects.dto';
import { EventsGateway } from '../events/events.gateway';
import { EmailService } from '../mail/email.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { hasProjectPermission } from '../auth/authorization/project-rbac';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) { }

  async create(dto: CreateProjectDto, userId: string) {
    const { members = [], invitations = [], ...projectPayload } = dto as any;
    const workflowStates = (dto.workflowStates ?? ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'])
      .map((state) => state.trim())
      .filter((state) => state.length > 0)
      .slice(0, 12);

    const created = await this.prisma.project.create({
      data: {
        ...projectPayload,
        workflowStates,
        ownerId: userId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
      include: this.projectIncludes(),
    });

    const actor = await this.getActorSnapshot(userId);
    const actorName = [actor?.firstName, actor?.lastName].filter(Boolean).join(' ').trim() || 'A team member';

    const uniqueMembers = Array.from(new Map(
      (members as Array<{ userId: string; role?: ProjectRole }> || [])
        .filter((member) => member?.userId && member.userId !== userId)
        .map((member) => [member.userId, member]),
    ).values());

    for (const member of uniqueMembers) {
      const role = (member.role as ProjectRole | undefined) ?? ProjectRole.MEMBER;
      const added = await this.prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: created.id, userId: member.userId } },
        update: { role },
        create: { projectId: created.id, userId: member.userId, role },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } },
        },
      });

      this.events.emitMemberAdded(created.id, {
        projectId: created.id,
        userId: member.userId,
        user: added.user,
      });

      await this.sendProjectMemberAddedNotification({
        targetUserId: member.userId,
        actorName,
        projectId: created.id,
        projectName: created.name,
        forceEmail: false,
      });
    }

    for (const invitation of (invitations as InviteMemberDto[]) || []) {
      await this.inviteMember(created.id, invitation, userId, Role.USER);
    }

    return this.findOne(created.id, userId, Role.USER);
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
    if (!hasProjectPermission(member?.role, 'project.update', userRole)) {
      throw new ForbiddenException('Only project admins can update the project');
    }

    const { members: _ignoredMembers, invitations: _ignoredInvitations, ...projectData } = dto as any;

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        ...projectData,
        workflowStates: dto.workflowStates
          ? dto.workflowStates.map((state) => state.trim()).filter((state) => state.length > 0).slice(0, 12)
          : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: this.projectIncludes(),
    });

    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, avatar: true, collaborationColor: true },
    });
    this.events.emitProjectUpdated(id, updated, actor);

    const activity = await this.prisma.activityLog.create({
      data: {
        action: 'UPDATED',
        entity: 'Project',
        entityId: id,
        newValue: dto as any,
        userId,
        projectId: id,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true, collaborationColor: true } },
      },
    });
    this.events.emitActivityCreated(id, activity);

    return updated;
  }

  async remove(id: string, userId: string, userRole: Role) {
    const project = await this.findOne(id, userId, userRole);
    const member = project.members.find((m) => m.userId === userId);

    if (!hasProjectPermission(member?.role, 'project.delete', userRole)) {
      throw new ForbiddenException('Only project owner can delete the project');
    }

    const deleted = await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    const actor = await this.getActorSnapshot(userId);
    const projectName = project.name;
    const memberUserIds = project.members.map((member) => member.userId).filter((memberId) => memberId !== userId);

    this.events.emitProjectDeleted(id, { projectId: id, projectName, actor });

    for (const memberUserId of memberUserIds) {
      await this.prisma.notification.create({
        data: {
          userId: memberUserId,
          type: 'project_deleted',
          title: 'Project deleted',
          body: `${projectName} was deleted`,
        },
      });

      this.events.emitToUser(memberUserId, 'notification', {
        type: 'project_deleted',
        i18nKey: 'notification.projectDeleted',
        i18nParams: { projectName },
        projectId: id,
        createdAt: new Date().toISOString(),
      });
    }

    return deleted;
  }

  async addMember(projectId: string, memberId: string, currentUserId: string, userRole: Role) {
    const project = await this.findOne(projectId, currentUserId, userRole);
    const member = project.members.find((m) => m.userId === currentUserId);

    if (!hasProjectPermission(member?.role, 'project.member.manage', userRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const existingMember = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberId } },
    });
    if (existingMember) {
      return existingMember;
    }

    // Fetch the new member's user data so we can broadcast their info
    const newMemberUser = await this.prisma.user.findUnique({
      where: { id: memberId },
      select: { id: true, firstName: true, lastName: true, avatar: true, email: true },
    });

    const result = await this.prisma.projectMember.create({
      data: { projectId, userId: memberId },
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

    // 2. Persist notification + notify the newly added member privately
    await this.sendProjectMemberAddedNotification({
      targetUserId: memberId,
      actorName,
      projectId,
      projectName: project.name,
      forceEmail: false,
    });

    const activity = await this.prisma.activityLog.create({
      data: {
        action: 'INVITED_MEMBER',
        entity: 'ProjectMember',
        entityId: result.id,
        newValue: {
          memberId,
          projectId,
          projectName: project.name,
        },
        userId: currentUserId,
        projectId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true, collaborationColor: true } },
      },
    });
    this.events.emitActivityCreated(projectId, activity);

    return result;
  }

  async updateMemberRole(
    projectId: string,
    memberId: string,
    role: ProjectRole,
    currentUserId: string,
    userRole: Role,
  ) {
    const project = await this.findOne(projectId, currentUserId, userRole);
    const actorMember = project.members.find((m) => m.userId === currentUserId);

    if (!hasProjectPermission(actorMember?.role, 'project.member.manage', userRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const targetMember = project.members.find((m) => m.userId === memberId);
    if (!targetMember) throw new NotFoundException('Member not found in this project');
    if (targetMember.role === 'OWNER') throw new ForbiddenException('Cannot change owner role');

    const updated = await this.prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId: memberId } },
      data: { role },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true, email: true, collaborationColor: true },
        },
      },
    });

    const activity = await this.prisma.activityLog.create({
      data: {
        action: 'ROLE_UPDATED',
        entity: 'ProjectMember',
        entityId: updated.id,
        oldValue: { role: targetMember.role, memberId },
        newValue: { role, memberId },
        userId: currentUserId,
        projectId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true, collaborationColor: true } },
      },
    });
    this.events.emitActivityCreated(projectId, activity);
    this.events.emitProjectUpdated(projectId, project, await this.getActorSnapshot(currentUserId));

    return updated;
  }

  async listInvitations(projectId: string, currentUserId: string, userRole: Role) {
    const project = await this.findOne(projectId, currentUserId, userRole);
    const member = project.members.find((m) => m.userId === currentUserId);
    if (!hasProjectPermission(member?.role, 'project.invitation.manage', userRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.prisma.projectInvitation.findMany({
      where: { projectId },
      include: {
        invitedUser: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } },
        invitedBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async inviteMember(projectId: string, dto: InviteMemberDto, currentUserId: string, userRole: Role) {
    const project = await this.findOne(projectId, currentUserId, userRole);
    const member = project.members.find((m) => m.userId === currentUserId);

    if (!hasProjectPermission(member?.role, 'project.invitation.manage', userRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const normalizedEmail = dto.email.trim().toLowerCase();
    const role = dto.role ?? ProjectRole.MEMBER;
    const actorName = member?.user
      ? `${(member.user as any).firstName} ${(member.user as any).lastName}`.trim()
      : 'A team member';

    const existingUser = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, deletedAt: null, isActive: true },
      select: { id: true, email: true, firstName: true, lastName: true, avatar: true },
    });

    if (existingUser) {
      const existingMember = await this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: existingUser.id } },
      });

      if (!existingMember) {
        await this.prisma.projectMember.create({
          data: { projectId, userId: existingUser.id, role },
        });
      }

      const invitation = await this.prisma.projectInvitation.create({
        data: {
          projectId,
          email: normalizedEmail,
          role,
          status: ProjectInvitationStatus.ACCEPTED,
          invitedById: currentUserId,
          invitedUserId: existingUser.id,
          acceptedAt: new Date(),
          message: dto.message,
        },
      });

      this.events.emitMemberAdded(projectId, {
        projectId,
        userId: existingUser.id,
        user: existingUser,
      });

      await this.sendProjectMemberAddedNotification({
        targetUserId: existingUser.id,
        actorName,
        projectId,
        projectName: project.name,
        forceEmail: true,
      });

      const activity = await this.prisma.activityLog.create({
        data: {
          action: 'INVITED_MEMBER',
          entity: 'ProjectInvitation',
          entityId: invitation.id,
          newValue: {
            email: normalizedEmail,
            role,
            status: invitation.status,
            projectName: project.name,
          },
          userId: currentUserId,
          projectId,
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatar: true, collaborationColor: true } },
        },
      });
      this.events.emitActivityCreated(projectId, activity);

      return { mode: 'existing_user', invitation };
    }

    const invitation = await this.prisma.projectInvitation.create({
      data: {
        projectId,
        email: normalizedEmail,
        role,
        invitedById: currentUserId,
        message: dto.message,
        token: randomUUID(),
        status: ProjectInvitationStatus.PENDING,
      },
      include: {
        invitedBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const projectUrl = `${frontendUrl}/projects/${projectId}`;
    try {
      await this.email.sendProjectInvitationEmail({
        to: normalizedEmail,
        userName: normalizedEmail.split('@')[0],
        invitedBy: actorName,
        projectName: project.name,
        projectUrl,
        supportEmail: this.config.get<string>('SUPPORT_EMAIL', 'support@tasku.pro'),
        year: new Date().getFullYear().toString(),
        companyName: this.config.get<string>('COMPANY_NAME', 'Tasku'),
        companyAddress: this.config.get<string>('COMPANY_ADDRESS', '123 Main St, Anytown'),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to send pending invitation email: ${msg}`);
    }

    const activity = await this.prisma.activityLog.create({
      data: {
        action: 'INVITED_MEMBER',
        entity: 'ProjectInvitation',
        entityId: invitation.id,
        newValue: {
          email: normalizedEmail,
          role,
          status: invitation.status,
          projectName: project.name,
        },
        userId: currentUserId,
        projectId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true, collaborationColor: true } },
      },
    });
    this.events.emitActivityCreated(projectId, activity);

    this.events.emitToUser(currentUserId, 'project.invitation', {
      type: 'project_invitation_sent',
      projectId,
      invitationId: invitation.id,
      email: normalizedEmail,
      status: invitation.status,
      createdAt: invitation.createdAt.toISOString(),
    });

    return { mode: 'pending_invite', invitation };
  }

  async removeMember(projectId: string, memberId: string, currentUserId: string, userRole: Role) {
    const project = await this.findOne(projectId, currentUserId, userRole);
    const member = project.members.find((m) => m.userId === currentUserId);

    if (!hasProjectPermission(member?.role, 'project.member.manage', userRole)) {
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

  async leave(projectId: string, currentUserId: string, userRole: Role) {
    const project = await this.findOne(projectId, currentUserId, userRole);
    const currentMember = project.members.find((member) => member.userId === currentUserId);

    if (!currentMember) {
      throw new NotFoundException('Member not found in this project');
    }
    if (currentMember.role === 'OWNER') {
      throw new ForbiddenException('Project owner cannot leave the project');
    }

    await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: currentUserId } },
    });

    this.events.emitMemberRemoved(projectId, currentUserId, { projectId, userId: currentUserId });

    const actor = await this.getActorSnapshot(currentUserId);
    const actorName = [actor?.firstName, actor?.lastName].filter(Boolean).join(' ').trim() || 'A member';

    const remainingMemberIds = project.members
      .map((member) => member.userId)
      .filter((memberId) => memberId !== currentUserId);

    for (const targetUserId of remainingMemberIds) {
      await this.prisma.notification.create({
        data: {
          userId: targetUserId,
          type: 'project_updated',
          title: 'Member left project',
          body: `${actorName} left ${project.name}`,
        },
      });
      this.events.emitToUser(targetUserId, 'notification', {
        type: 'project_updated',
        i18nKey: 'notification.projectMemberLeft',
        i18nParams: { memberName: actorName, projectName: project.name },
        projectId,
        createdAt: new Date().toISOString(),
      });
    }

    return { left: true, projectId };
  }

  private projectIncludes() {
    return {
      owner: {
        select: { id: true, firstName: true, lastName: true, avatar: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true, email: true, collaborationColor: true },
          },
        },
      },
      invitations: {
        where: { status: { in: [ProjectInvitationStatus.PENDING, ProjectInvitationStatus.ACCEPTED] } },
        orderBy: { createdAt: 'desc' as const },
        include: {
          invitedUser: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } },
          invitedBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      },
      _count: { select: { tasks: { where: { deletedAt: null } }, members: true } },
    };
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

  private async sendProjectMemberAddedNotification(input: {
    targetUserId: string;
    actorName: string;
    projectId: string;
    projectName: string;
    forceEmail?: boolean;
  }) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: input.targetUserId },
      select: { id: true, firstName: true, email: true, notificationPrefs: true },
    });

    const prefs = this.parseNotificationPrefs(targetUser?.notificationPrefs);
    if (prefs.projectUpdates) {
      await this.prisma.notification.create({
        data: {
          userId: input.targetUserId,
          type: 'project_updated',
          title: 'Project invitation',
          body: `You were added to ${input.projectName}`,
        },
      });
    }

    if (prefs.projectUpdates && prefs.realtimeNotifications) {
      this.events.emitToUser(input.targetUserId, 'notification', {
        type: 'project_updated',
        i18nKey: 'notification.projectMemberAdded',
        i18nParams: { projectName: input.projectName },
        projectId: input.projectId,
        actorName: input.actorName,
      });
    }

    if ((input.forceEmail || prefs.projectUpdates) && prefs.emailNotifications && targetUser?.email) {
      const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
      const projectUrl = `${frontendUrl}/projects/${input.projectId}`;
      try {
        await this.email.sendProjectInvitationEmail({
          to: targetUser.email,
          userId: input.targetUserId,
          userName: targetUser.firstName,
          invitedBy: input.actorName,
          projectName: input.projectName,
          projectUrl,
          supportEmail: this.config.get<string>('SUPPORT_EMAIL', 'support@tasku.pro'),
          year: new Date().getFullYear().toString(),
          companyName: this.config.get<string>('COMPANY_NAME', 'Tasku'),
          companyAddress: this.config.get<string>('COMPANY_ADDRESS', '123 Main St, Anytown'),
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to send project invitation email: ${msg}`);
      }
    }
  }

  private async getActorSnapshot(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, avatar: true, collaborationColor: true },
    });
  }
}
