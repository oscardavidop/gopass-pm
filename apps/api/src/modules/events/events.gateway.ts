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
  socketId: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  /** projectId → Map<socketId, PresenceUser> */
  private presenceRooms = new Map<string, Map<string, PresenceUser>>();

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
        select: { id: true, firstName: true, lastName: true, avatar: true },
      });
      if (!user) { client.disconnect(); return; }
      client.data.user = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
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
        members.delete(client.id);
        this._broadcastPresence(projectId);
      }
    });
  }

  @SubscribeMessage('join:project')
  handleJoinProject(@ConnectedSocket() client: Socket, @MessageBody() projectId: string) {
    client.join(`project:${projectId}`);
  }

  @SubscribeMessage('leave:project')
  handleLeaveProject(@ConnectedSocket() client: Socket, @MessageBody() projectId: string) {
    client.leave(`project:${projectId}`);
  }

  @SubscribeMessage('presence:join')
  handlePresenceJoin(@ConnectedSocket() client: Socket, @MessageBody() projectId: string) {
    client.join(`project:${projectId}`);
    if (!this.presenceRooms.has(projectId)) this.presenceRooms.set(projectId, new Map());
    const user = client.data.user;
    if (user) this.presenceRooms.get(projectId)!.set(client.id, { ...user, socketId: client.id });
    this._broadcastPresence(projectId);
  }

  @SubscribeMessage('presence:leave')
  handlePresenceLeave(@ConnectedSocket() client: Socket, @MessageBody() projectId: string) {
    client.leave(`project:${projectId}`);
    this.presenceRooms.get(projectId)?.delete(client.id);
    this._broadcastPresence(projectId);
  }

  private _broadcastPresence(projectId: string) {
    const members = Array.from(this.presenceRooms.get(projectId)?.values() ?? []);
    this.server.to(`project:${projectId}`).emit('presence:update', members);
  }

  emitTaskUpdated(projectId: string, task: any) {
    this.server.to(`project:${projectId}`).emit('task:updated', task);
  }

  emitTaskCreated(projectId: string, task: any) {
    this.server.to(`project:${projectId}`).emit('task:created', task);
  }

  emitTaskDeleted(projectId: string, taskId: string) {
    this.server.to(`project:${projectId}`).emit('task:deleted', { id: taskId, projectId });
  }

  /** Emit a notification directly to a specific user's private room */
  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
