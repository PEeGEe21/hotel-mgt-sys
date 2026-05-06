import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);

  constructor(private readonly redisService: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    await this.redisService.ensureReady();

    const value = await this.redisService.command.get(this.buildKey(key));
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn(`Failed to parse cached payload for key ${key}: ${String(error)}`);
      await this.redisService.command.del(this.buildKey(key));
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number) {
    await this.redisService.ensureReady();
    await this.redisService.command.set(
      this.buildKey(key),
      JSON.stringify(value),
      'EX',
      Math.max(1, ttlSeconds),
    );
  }

  async del(key: string) {
    await this.redisService.ensureReady();
    await this.redisService.command.del(this.buildKey(key));
  }

  async delMany(keys: string[]) {
    if (keys.length === 0) {
      return;
    }

    await this.redisService.ensureReady();
    await this.redisService.command.del(...keys.map((key) => this.buildKey(key)));
  }

  async getOrSet<T>(key: string, ttlSeconds: number, resolver: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await resolver();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  private buildKey(key: string) {
    return `cache:${key}`;
  }
}
