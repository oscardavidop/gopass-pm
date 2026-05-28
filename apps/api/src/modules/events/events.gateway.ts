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

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwt.verify(token, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      });

      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:project')
  handleJoinProject(@ConnectedSocket() client: Socket, @MessageBody() projectId: string) {
    client.join(`project:${projectId}`);
  }

  @SubscribeMessage('leave:project')
  handleLeaveProject(@ConnectedSocket() client: Socket, @MessageBody() projectId: string) {
    client.leave(`project:${projectId}`);
  }

  // Emitters called from services
  emitTaskUpdated(projectId: string, task: any) {
    this.server.to(`project:${projectId}`).emit('task:updated', task);
  }

  emitTaskCreated(projectId: string, task: any) {
    this.server.to(`project:${projectId}`).emit('task:created', task);
  }

  emitTaskDeleted(projectId: string, taskId: string) {
    this.server.to(`project:${projectId}`).emit('task:deleted', { id: taskId });
  }
}
