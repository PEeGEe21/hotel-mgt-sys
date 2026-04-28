import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

function buildRedisClient(configService: ConfigService) {
  const redisUrl = configService.get<string>('redis.url') || 'redis://localhost:6379';
  return new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly commandClient: Redis;
  private readonly publisherClient: Redis;
  private readonly subscriberClient: Redis;

  constructor(private readonly configService: ConfigService) {
    this.commandClient = buildRedisClient(configService);
    this.publisherClient = buildRedisClient(configService);
    this.subscriberClient = buildRedisClient(configService);
  }

  get command() {
    return this.commandClient;
  }

  get publisher() {
    return this.publisherClient;
  }

  get subscriber() {
    return this.subscriberClient;
  }

  async ensureReady() {
    await Promise.all([
      this.connectIfNeeded(this.commandClient, 'command'),
      this.connectIfNeeded(this.publisherClient, 'publisher'),
      this.connectIfNeeded(this.subscriberClient, 'subscriber'),
    ]);
  }

  private async connectIfNeeded(client: Redis, label: string) {
    if (client.status === 'ready' || client.status === 'connecting' || client.status === 'connect') {
      return;
    }

    try {
      await client.connect();
    } catch (error) {
      this.logger.error(`Redis ${label} client failed to connect: ${String(error)}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    await Promise.allSettled([
      this.commandClient.quit(),
      this.publisherClient.quit(),
      this.subscriberClient.quit(),
    ]);
  }
}
