import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

const PRESENCE_UPDATES_CHANNEL = 'realtime:presence-updates';

export type PresenceUpdateEvent = {
  userId: string;
  hotelId: string | null;
  isOnline: boolean;
  connections: number;
  lastSeenAt: string | null;
  timestamp: string;
};

type RegisterPresenceInput = {
  socketId: string;
  userId: string;
  hotelId: string | null;
};

@Injectable()
export class RealtimePresenceService implements OnModuleInit {
  private readonly logger = new Logger(RealtimePresenceService.name);

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    await this.redisService.ensureReady();
  }

  private userSocketsKey(userId: string) {
    return `presence:user:${userId}:sockets`;
  }

  private userLastSeenKey(userId: string) {
    return `presence:user:${userId}:last-seen`;
  }

  private socketMetaKey(socketId: string) {
    return `presence:socket:${socketId}`;
  }

  async registerConnection(input: RegisterPresenceInput) {
    const now = new Date().toISOString();
    const userSocketsKey = this.userSocketsKey(input.userId);

    const tx = this.redisService.command.multi();
    tx.sadd(userSocketsKey, input.socketId);
    tx.hset(this.socketMetaKey(input.socketId), {
      userId: input.userId,
      hotelId: input.hotelId ?? '',
      connectedAt: now,
    });
    tx.set(this.userLastSeenKey(input.userId), now);
    tx.scard(userSocketsKey);
    const results = await tx.exec();
    const connections = Number(results?.[3]?.[1] ?? 0);

    await this.publishUpdate({
      userId: input.userId,
      hotelId: input.hotelId,
      isOnline: connections > 0,
      connections,
      lastSeenAt: now,
      timestamp: now,
    });
  }

  async unregisterConnection(socketId: string) {
    const socketMeta = await this.redisService.command.hgetall(this.socketMetaKey(socketId));
    const userId = socketMeta.userId;
    if (!userId) return;

    const hotelId = socketMeta.hotelId || null;
    const now = new Date().toISOString();
    const userSocketsKey = this.userSocketsKey(userId);

    const tx = this.redisService.command.multi();
    tx.srem(userSocketsKey, socketId);
    tx.del(this.socketMetaKey(socketId));
    tx.set(this.userLastSeenKey(userId), now);
    tx.scard(userSocketsKey);
    const results = await tx.exec();
    const connections = Number(results?.[3]?.[1] ?? 0);

    await this.publishUpdate({
      userId,
      hotelId,
      isOnline: connections > 0,
      connections,
      lastSeenAt: now,
      timestamp: now,
    });
  }

  async clearUserPresence(userId: string, hotelId: string | null) {
    const userSocketsKey = this.userSocketsKey(userId);
    const socketIds = await this.redisService.command.smembers(userSocketsKey);
    const now = new Date().toISOString();

    const tx = this.redisService.command.multi();
    socketIds.forEach((socketId) => {
      tx.del(this.socketMetaKey(socketId));
    });
    tx.del(userSocketsKey);
    tx.set(this.userLastSeenKey(userId), now);
    await tx.exec();

    await this.publishUpdate({
      userId,
      hotelId,
      isOnline: false,
      connections: 0,
      lastSeenAt: now,
      timestamp: now,
    });
  }

  async getPresenceMap(userIds: string[]) {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    if (!uniqueUserIds.length) return new Map<string, { isOnline: boolean; lastSeenAt: string | null }>();

    const pipeline = this.redisService.command.pipeline();
    uniqueUserIds.forEach((userId) => {
      pipeline.scard(this.userSocketsKey(userId));
      pipeline.get(this.userLastSeenKey(userId));
    });
    const results = await pipeline.exec();

    const presence = new Map<string, { isOnline: boolean; lastSeenAt: string | null }>();
    uniqueUserIds.forEach((userId, index) => {
      const count = Number(results?.[index * 2]?.[1] ?? 0);
      const lastSeenAt = (results?.[index * 2 + 1]?.[1] as string | null) ?? null;
      presence.set(userId, {
        isOnline: count > 0,
        lastSeenAt,
      });
    });

    return presence;
  }

  async subscribe(handler: (event: PresenceUpdateEvent) => void) {
    await this.redisService.ensureReady();
    await this.redisService.subscriber.subscribe(PRESENCE_UPDATES_CHANNEL);
    this.redisService.subscriber.on('message', (channel, payload) => {
      if (channel !== PRESENCE_UPDATES_CHANNEL) return;

      try {
        handler(JSON.parse(payload) as PresenceUpdateEvent);
      } catch (error) {
        this.logger.warn(`Failed to parse presence payload: ${String(error)}`);
      }
    });
  }

  private async publishUpdate(event: PresenceUpdateEvent) {
    await this.redisService.publisher.publish(PRESENCE_UPDATES_CHANNEL, JSON.stringify(event));
  }
}
