import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RealtimeAuthService, RealtimeUser } from './realtime-auth.service';
import { NotificationEvent } from '../notifications/notifications.constants';

type NotificationSyncPayload = {
  hotelId: string | null;
  reason: 'created' | 'read' | 'read-all';
  event?: NotificationEvent;
  timestamp: string;
};

type AuthedSocket = Socket & {
  data: Socket['data'] & {
    user?: RealtimeUser;
  };
};

@WebSocketGateway({
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private realtimeAuthService: RealtimeAuthService) {}

  afterInit() {
    this.logger.log('Realtime gateway initialized');
  }

  async handleConnection(client: AuthedSocket) {
    try {
      const user = await this.realtimeAuthService.authenticate(client);
      client.data.user = user;

      await client.join(this.getUserRoom(user.sub));
      if (user.hotelId) {
        await client.join(this.getHotelRoom(user.hotelId));
      }

      client.emit('realtime.ready', {
        userId: user.sub,
        hotelId: user.hotelId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(`Rejected realtime connection ${client.id}: ${String(error)}`);
      client.emit('realtime.error', { message: 'Unauthorized realtime connection.' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthedSocket) {
    if (!client.data.user) return;
    this.logger.debug(`Realtime client disconnected: ${client.data.user.sub}`);
  }

  private getUserRoom(userId: string) {
    return `user:${userId}`;
  }

  private getHotelRoom(hotelId: string) {
    return `hotel:${hotelId}`;
  }

  emitNotificationSync(userIds: string[], payload: NotificationSyncPayload) {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    uniqueUserIds.forEach((userId) => {
      this.server.to(this.getUserRoom(userId)).emit('notifications.sync', {
        userId,
        ...payload,
      });
    });
  }
}
