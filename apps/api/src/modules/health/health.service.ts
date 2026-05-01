import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { getReleaseMetadata, monitoringNotifier } from '../../common/monitoring/monitoring.notifier';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      release: getReleaseMetadata(),
    };
  }

  async getReadiness() {
    const checks = {
      api: { status: 'ok' },
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
    };
    const status = Object.values(checks).every((check) => check.status === 'ok') ? 'ok' : 'degraded';
    const readiness = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      release: getReleaseMetadata(),
      checks,
    };

    if (status !== 'ok') {
      void monitoringNotifier.notifyReadinessDegraded(readiness as Record<string, unknown>);
    }

    return readiness;
  }

  private async checkDatabase() {
    const startedAt = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Database health check failed',
      };
    }
  }

  private async checkRedis() {
    const startedAt = Date.now();

    try {
      await this.redis.ensureReady();
      await this.redis.command.ping();

      return {
        status: 'ok',
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Redis health check failed',
      };
    }
  }
}
