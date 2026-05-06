import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RealtimeAuthService, RealtimeUser } from './realtime-auth.service';
import { NotificationEvent } from '../notifications/notifications.constants';
import { PresenceUpdateEvent, RealtimePresenceService } from './realtime-presence.service';
import { RealtimeDiagnosticsService } from './realtime-diagnostics.service';
import {
  FACILITIES_MAINTENANCE_SYNC_EVENT,
  FacilitiesMaintenanceSyncPayload,
  HOUSEKEEPING_TASKS_SYNC_EVENT,
  POS_ORDERS_SYNC_EVENT,
  POS_PREP_SYNC_EVENT,
  HousekeepingTaskSyncPayload,
  PosOrderSyncPayload,
  PosPrepSyncPayload,
} from './realtime.events';

type NotificationSyncPayload = {
  hotelId: string | null;
  reason: 'created' | 'read' | 'read-all' | 'updated';
  event?: NotificationEvent;
  timestamp: string;
};

type PresenceSyncPayload = PresenceUpdateEvent;

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

  constructor(
    private realtimeAuthService: RealtimeAuthService,
    private realtimePresenceService: RealtimePresenceService,
    private realtimeDiagnosticsService: RealtimeDiagnosticsService,
  ) {}

  afterInit() {
    this.logger.log('Realtime gateway initialized');
    void this.realtimePresenceService.subscribe((event) => {
      this.emitPresenceSync(event);
    });
  }

  async handleConnection(client: AuthedSocket) {
    try {
      const user = await this.realtimeAuthService.authenticate(client);
      client.data.user = user;

      await client.join(this.getUserRoom(user.sub));
      if (user.hotelId) {
        await client.join(this.getHotelRoom(user.hotelId));
      }

      await this.realtimePresenceService.registerConnection({
        socketId: client.id,
        userId: user.sub,
        hotelId: user.hotelId,
      });

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
    void this.realtimePresenceService.unregisterConnection(client.id);
    this.logger.debug(`Realtime client disconnected: ${client.data.user.sub}`);
  }

  @SubscribeMessage('presence.leave')
  async handlePresenceLeave(@ConnectedSocket() client: AuthedSocket) {
    if (!client.data.user) return { ok: false };
    await this.realtimePresenceService.unregisterConnection(client.id);
    return { ok: true };
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
    void this.realtimeDiagnosticsService.recordEvent({
      hotelId: payload.hotelId,
      moduleKey: 'notifications',
      eventName: 'notifications.sync',
      eventType: payload.reason,
      summary: payload.event
        ? `Notification ${payload.reason} for ${payload.event}`
        : `Notification ${payload.reason}`,
      payload,
      timestamp: payload.timestamp,
    });
  }

  emitPresenceSync(payload: PresenceSyncPayload) {
    if (payload.hotelId) {
      this.server.to(this.getHotelRoom(payload.hotelId)).emit('presence.sync', payload);
    }
    this.server.to(this.getUserRoom(payload.userId)).emit('presence.sync', payload);
    void this.realtimeDiagnosticsService.recordEvent({
      hotelId: payload.hotelId,
      moduleKey: 'presence',
      eventName: 'presence.sync',
      eventType: payload.isOnline ? 'online' : 'offline',
      summary: `Presence ${payload.isOnline ? 'online' : 'offline'} for user ${payload.userId}`,
      payload,
      timestamp: payload.timestamp,
    });
  }

  emitPosOrderSync(payload: PosOrderSyncPayload) {
    this.server.to(this.getHotelRoom(payload.hotelId)).emit(POS_ORDERS_SYNC_EVENT, payload);
    void this.realtimeDiagnosticsService.recordEvent({
      hotelId: payload.hotelId,
      moduleKey: 'posOrders',
      eventName: POS_ORDERS_SYNC_EVENT,
      eventType: payload.action,
      summary: `${payload.action} ${payload.data.orderNo}`,
      payload,
      timestamp: payload.timestamp,
    });
  }

  emitPosPrepSync(payload: PosPrepSyncPayload) {
    this.server.to(this.getHotelRoom(payload.hotelId)).emit(POS_PREP_SYNC_EVENT, payload);
    void this.realtimeDiagnosticsService.recordEvent({
      hotelId: payload.hotelId,
      moduleKey: 'prep',
      eventName: POS_PREP_SYNC_EVENT,
      eventType: payload.action,
      summary: `${payload.action} ${payload.data.orderNo}`,
      payload,
      timestamp: payload.timestamp,
    });
  }

  emitHousekeepingTaskSync(payload: HousekeepingTaskSyncPayload) {
    this.server.to(this.getHotelRoom(payload.hotelId)).emit(HOUSEKEEPING_TASKS_SYNC_EVENT, payload);
    void this.realtimeDiagnosticsService.recordEvent({
      hotelId: payload.hotelId,
      moduleKey: 'housekeeping',
      eventName: HOUSEKEEPING_TASKS_SYNC_EVENT,
      eventType: payload.action,
      summary: payload.data.roomNumber
        ? `${payload.action} room ${payload.data.roomNumber}`
        : payload.data.count
          ? `${payload.action} ${payload.data.count} tasks`
          : `Housekeeping ${payload.action}`,
      payload,
      timestamp: payload.timestamp,
    });
  }

  emitFacilitiesMaintenanceSync(payload: FacilitiesMaintenanceSyncPayload) {
    this.server
      .to(this.getHotelRoom(payload.hotelId))
      .emit(FACILITIES_MAINTENANCE_SYNC_EVENT, payload);
    void this.realtimeDiagnosticsService.recordEvent({
      hotelId: payload.hotelId,
      moduleKey: 'facilities',
      eventName: FACILITIES_MAINTENANCE_SYNC_EVENT,
      eventType: payload.action,
      summary: `${payload.action} ${payload.data.requestNo}`,
      payload,
      timestamp: payload.timestamp,
    });
  }
}
