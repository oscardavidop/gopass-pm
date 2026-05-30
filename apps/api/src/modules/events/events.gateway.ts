import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/database/prisma.service';

interface PresenceUser {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  collaborationColor?: string | null;
  socketId: string;
  lastActiveAt: string;
  status: 'online' | 'idle';
}

interface TaskPresenceUser {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  collaborationColor?: string | null;
}

interface TaskPresenceEntry {
  user: TaskPresenceUser;
  mode: 'viewing' | 'editing';
  field?: string;
  socketId: string;
  updatedAt: number;
}

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      const allowed = (process.env.CORS_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean);
      if (!origin || allowed.length === 0 || allowed.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS blocked'));
    },
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly eventRateMap = new Map<string, number[]>();

  /** projectId → Map<socketId, PresenceUser> */
  private presenceRooms = new Map<string, Map<string, PresenceUser>>();
  /** projectId → taskId → Map<socketId, TaskPresenceEntry> */
  private taskPresenceRooms = new Map<string, Map<string, Map<string, TaskPresenceEntry>>>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) { client.disconnect(); return; }

      const payload = this.jwt.verify(token, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      });

      client.data.userId = payload.sub;
      // JWT payload only has sub/email/role — fetch real user data from DB
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, firstName: true, lastName: true, avatar: true, collaborationColor: true, email: true },
      });
      if (!user) { client.disconnect(); return; }

      const collaborationColor = user.collaborationColor ?? this.pickCollaborationColor(user.email);
      if (!user.collaborationColor) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { collaborationColor },
        });
      }

      client.data.user = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        collaborationColor,
      };
      client.join(`user:${payload.sub}`);
      this.logger.log(`Client connected: ${client.id} (user: ${user.firstName} ${user.lastName})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.presenceRooms.forEach((members, projectId) => {
      if (members.has(client.id)) {
        const leaving = members.get(client.id);
        members.delete(client.id);
        this._broadcastPresence(projectId);
        this.server.to(`project:${projectId}`).emit('member.left', {
          projectId,
          user: leaving,
          timestamp: new Date().toISOString(),
        });
        if (members.size === 0) this.presenceRooms.delete(projectId);
      }
    });

    this.taskPresenceRooms.forEach((taskMap, projectId) => {
      taskMap.forEach((entries, taskId) => {
        if (entries.has(client.id)) {
          entries.delete(client.id);
          this._broadcastTaskPresence(projectId, taskId);
          if (entries.size === 0) taskMap.delete(taskId);
        }
      });
      if (taskMap.size === 0) this.taskPresenceRooms.delete(projectId);
    });

    this.eventRateMap.forEach((_, key) => {
      if (key.startsWith(`${client.id}:`)) this.eventRateMap.delete(key);
    });
  }

  @SubscribeMessage('join:project')
  async handleJoinProject(@ConnectedSocket() client: Socket, @MessageBody() projectId: string) {
    if (!this.allowEvent(client.id, 'join:project', 40, 60_000)) return;
    if (!(await this.isProjectMember(client, projectId))) return;
    client.join(`project:${projectId}`);
  }

  @SubscribeMessage('leave:project')
  async handleLeaveProject(@ConnectedSocket() client: Socket, @MessageBody() projectId: string) {
    if (!(await this.isProjectMember(client, projectId))) return;
    client.leave(`project:${projectId}`);
  }

  @SubscribeMessage('presence:join')
  async handlePresenceJoin(@ConnectedSocket() client: Socket, @MessageBody() projectId: string) {
    if (!this.allowEvent(client.id, 'presence:join', 30, 60_000)) return;
    if (!(await this.isProjectMember(client, projectId))) return;
    client.join(`project:${projectId}`);
    if (!this.presenceRooms.has(projectId)) this.presenceRooms.set(projectId, new Map());
    const user = client.data.user;
    if (user) {
      this.presenceRooms.get(projectId)!.set(client.id, {
        ...user,
        socketId: client.id,
        lastActiveAt: new Date().toISOString(),
        status: 'online',
      });
      this.server.to(`project:${projectId}`).emit('member.joined', {
        projectId,
        user: {
          ...user,
          socketId: client.id,
          status: 'online',
        },
        timestamp: new Date().toISOString(),
      });
    }
    this._broadcastPresence(projectId);
  }

  @SubscribeMessage('presence:heartbeat')
  async handlePresenceHeartbeat(@ConnectedSocket() client: Socket, @MessageBody() projectId: string) {
    if (!(await this.isProjectMember(client, projectId))) return;
    const room = this.presenceRooms.get(projectId);
    const presence = room?.get(client.id);
    if (presence) {
      presence.lastActiveAt = new Date().toISOString();
      presence.status = 'online';
      room!.set(client.id, presence);
      this._broadcastPresence(projectId);
    }
  }

  @SubscribeMessage('presence:leave')
  async handlePresenceLeave(@ConnectedSocket() client: Socket, @MessageBody() projectId: string) {
    if (!(await this.isProjectMember(client, projectId))) return;
    client.leave(`project:${projectId}`);
    const leaving = this.presenceRooms.get(projectId)?.get(client.id);
    this.presenceRooms.get(projectId)?.delete(client.id);
    this.server.to(`project:${projectId}`).emit('member.left', {
      projectId,
      user: leaving,
      timestamp: new Date().toISOString(),
    });
    this._broadcastPresence(projectId);
  }

  @SubscribeMessage('task:viewing')
  async handleTaskViewing(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { projectId: string; taskId: string; active?: boolean },
  ) {
    if (!(await this.hasTaskAccess(client, payload.projectId, payload.taskId))) return;
    const { projectId, taskId, active = true } = payload;
    this._setTaskPresence(client, projectId, taskId, active ? 'viewing' : null);
  }

  @SubscribeMessage('task:editing')
  async handleTaskEditing(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { projectId: string; taskId: string; active: boolean; field?: string },
  ) {
    if (!this.allowEvent(client.id, 'task:editing', 120, 60_000)) return;
    if (!(await this.hasTaskAccess(client, payload.projectId, payload.taskId))) return;
    const { projectId, taskId, active, field } = payload;
    this._setTaskPresence(client, projectId, taskId, active ? 'editing' : null, field);
  }

  @SubscribeMessage('task:presence:leave')
  async handleTaskPresenceLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { projectId: string; taskId: string },
  ) {
    if (!(await this.hasTaskAccess(client, payload.projectId, payload.taskId))) return;
    this._setTaskPresence(client, payload.projectId, payload.taskId, null);
  }

  private allowEvent(socketId: string, eventName: string, limit: number, ttlMs: number) {
    const now = Date.now();
    const key = `${socketId}:${eventName}`;
    const bucket = (this.eventRateMap.get(key) ?? []).filter((ts) => ts > now - ttlMs);
    if (bucket.length >= limit) return false;
    bucket.push(now);
    this.eventRateMap.set(key, bucket);
    return true;
  }

  private async isProjectMember(client: Socket, projectId: string) {
    const userId = client.data.userId as string | undefined;
    if (!userId || !projectId) return false;

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { id: true },
    });

    return !!member;
  }

  private async hasTaskAccess(client: Socket, projectId: string, taskId: string) {
    if (!(await this.isProjectMember(client, projectId))) return false;

    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, deletedAt: null },
      select: { id: true },
    });

    return !!task;
  }

  private _broadcastPresence(projectId: string) {
    const now = Date.now();
    const members = Array.from(this.presenceRooms.get(projectId)?.values() ?? []).map((item) => {
      const lastActiveMs = new Date(item.lastActiveAt).getTime();
      const idle = now - lastActiveMs > 45_000;
      return {
        ...item,
        status: idle ? 'idle' : 'online',
      };
    });
    this.server.to(`project:${projectId}`).emit('presence:update', members);
  }

  private _setTaskPresence(
    client: Socket,
    projectId: string,
    taskId: string,
    mode: 'viewing' | 'editing' | null,
    field?: string,
  ) {
    if (!this.taskPresenceRooms.has(projectId)) this.taskPresenceRooms.set(projectId, new Map());
    const projectMap = this.taskPresenceRooms.get(projectId)!;
    if (!projectMap.has(taskId)) projectMap.set(taskId, new Map());
    const taskMap = projectMap.get(taskId)!;
    const previous = taskMap.get(client.id);

    if (mode === null) {
      if (!previous) return;
      taskMap.delete(client.id);
      this._broadcastTaskPresence(projectId, taskId, client.id);
      return;
    }

    const user = client.data.user as TaskPresenceUser | undefined;
    if (!user) return;

    // Skip no-op updates to avoid noisy duplicate events/re-renders on clients.
    if (
      previous &&
      previous.mode === mode &&
      (previous.field ?? null) === (field ?? null) &&
      previous.user.id === user.id
    ) {
      return;
    }

    taskMap.set(client.id, {
      user,
      mode,
      field,
      socketId: client.id,
      updatedAt: Date.now(),
    });

    this._broadcastTaskPresence(projectId, taskId, client.id);
  }

  private _broadcastTaskPresence(projectId: string, taskId: string, excludeSocketId?: string) {
    const entries = Array.from(this.taskPresenceRooms.get(projectId)?.get(taskId)?.values() ?? []);
    const viewing = entries
      .filter((entry) => entry.mode === 'viewing')
      .map((entry) => entry.user);
    const editing = entries
      .filter((entry) => entry.mode === 'editing')
      .map((entry) => ({ user: entry.user, field: entry.field }));

    const room = this.server.to(`project:${projectId}`);
    const target = excludeSocketId ? room.except(excludeSocketId) : room;

    target.emit('task.presence', {
      projectId,
      taskId,
      viewing,
      editing,
      timestamp: new Date().toISOString(),
    });

    target.emit('task.viewing', {
      projectId,
      taskId,
      users: viewing,
      timestamp: new Date().toISOString(),
    });

    target.emit('task.editing', {
      projectId,
      taskId,
      users: editing,
      timestamp: new Date().toISOString(),
    });
  }

  emitTaskUpdated(projectId: string, task: any, meta?: { actor?: any; oldValue?: Record<string, any>; changedFields?: string[] }) {
    this.server.to(`project:${projectId}`).emit('task:updated', task);
    this.server.to(`project:${projectId}`).emit('task.updated', {
      projectId,
      taskId: task.id,
      task,
      actor: meta?.actor,
      oldValue: meta?.oldValue,
      changedFields: meta?.changedFields ?? [],
      timestamp: new Date().toISOString(),
    });

    if (meta?.changedFields?.includes('status')) {
      this.server.to(`project:${projectId}`).emit('task.moved', {
        projectId,
        taskId: task.id,
        task,
        actor: meta?.actor,
        from: meta?.oldValue?.status,
        to: task.status,
        timestamp: new Date().toISOString(),
      });
    }
  }

  emitTaskCreated(projectId: string, task: any, meta?: { actor?: any }) {
    this.server.to(`project:${projectId}`).emit('task:created', task);
    this.server.to(`project:${projectId}`).emit('task.created', {
      projectId,
      taskId: task.id,
      task,
      actor: meta?.actor,
      timestamp: new Date().toISOString(),
    });
  }

  emitTaskDeleted(projectId: string, taskId: string, meta?: { actor?: any; task?: any }) {
    this.server.to(`project:${projectId}`).emit('task:deleted', { id: taskId, projectId });
    this.server.to(`project:${projectId}`).emit('task.deleted', {
      projectId,
      taskId,
      actor: meta?.actor,
      task: meta?.task,
      timestamp: new Date().toISOString(),
    });
  }

  emitProjectUpdated(projectId: string, project: any, actor?: any) {
    this.server.to(`project:${projectId}`).emit('project.updated', {
      projectId,
      project,
      actor,
      timestamp: new Date().toISOString(),
    });
  }

  emitProjectDeleted(projectId: string, data?: { projectId: string; projectName?: string; actor?: any }) {
    this.server.to(`project:${projectId}`).emit('project.deleted', {
      projectId,
      projectName: data?.projectName,
      actor: data?.actor,
      timestamp: new Date().toISOString(),
    });
  }

  emitActivityCreated(projectId: string, activity: any) {
    this.server.to(`project:${projectId}`).emit('activity.created', {
      projectId,
      activity,
      timestamp: new Date().toISOString(),
    });
  }

  /** Broadcast that a new member was added — refreshes member list for everyone in the project */
  emitMemberAdded(projectId: string, data: { projectId: string; userId: string; user: any }) {
    this.server.to(`project:${projectId}`).emit('project:member_added', data);
  }

  /**
   * Broadcast that a member was removed:
   * 1. Notifies everyone in the project room so they refresh the member list.
   * 2. Forces the removed user's socket(s) to leave the project room (no more task events).
   * 3. Removes them from presence and re-broadcasts the updated presence list.
   * 4. Sends a private notification to the removed user so the frontend can redirect them.
   */
  emitMemberRemoved(projectId: string, removedUserId: string, data: { projectId: string; userId: string }) {
    // 1. Notify everyone currently in the room (before forcing the user out)
    this.server.to(`project:${projectId}`).emit('project:member_removed', data);
    this.server.to(`project:${projectId}`).emit('member.left', {
      projectId,
      user: { id: removedUserId },
      timestamp: new Date().toISOString(),
    });
    // 2. Force-leave the project room for all sockets belonging to removed user
    this.server.in(`user:${removedUserId}`).socketsLeave(`project:${projectId}`);
    // 3. Remove from presence map + broadcast updated list
    const presenceMap = this.presenceRooms.get(projectId);
    if (presenceMap) {
      presenceMap.forEach((user, socketId) => {
        if (user.id === removedUserId) presenceMap.delete(socketId);
      });
      this._broadcastPresence(projectId);
    }
    // 4. Private signal to the removed user so the frontend can navigate away
    this.server.to(`user:${removedUserId}`).emit('notification', {
      type: 'project_access_revoked',
      projectId,
      i18nKey: 'notification.projectAccessRevoked',
      i18nParams: { projectId },
    });
  }

  /** Emit a notification directly to a specific user's private room */
  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  private pickCollaborationColor(seed: string) {
    const palette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#ec4899'];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    return palette[Math.abs(hash) % palette.length];
  }
}
