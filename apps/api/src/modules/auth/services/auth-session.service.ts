import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { RedisService } from '../../../common/redis/redis.service';

type SessionActor = {
  userId: string;
  hotelId?: string | null;
  impersonatorId?: string | null;
  isImpersonation?: boolean;
};

type SessionMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AuthSessionRecord = {
  id: string;
  userId: string;
  hotelId: string | null;
  impersonatorId: string | null;
  isImpersonation: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
};

export type ListedAuthSessionRecord = AuthSessionRecord & {
  current: boolean;
};

@Injectable()
export class AuthSessionService {
  private readonly refreshLifetimeMs: number;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.refreshLifetimeMs = this.parseDurationMs(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
      7 * 24 * 60 * 60 * 1000,
    );
  }

  async createSession(actor: SessionActor, meta?: SessionMeta) {
    await this.redisService.ensureReady();

    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.refreshLifetimeMs);
    const session = this.serializeSession({
      id: sessionId,
      userId: actor.userId,
      hotelId: actor.hotelId ?? null,
      impersonatorId: actor.impersonatorId ?? null,
      isImpersonation: Boolean(actor.isImpersonation),
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    const ttlSeconds = this.getTtlSeconds(expiresAt);
    const multi = this.redisService.command.multi();
    multi.hset(this.sessionKey(sessionId), session);
    multi.expire(this.sessionKey(sessionId), ttlSeconds);
    multi.sadd(this.userSessionsKey(actor.userId), sessionId);
    multi.expire(this.userSessionsKey(actor.userId), ttlSeconds);
    await multi.exec();

    return {
      sessionId,
      expiresAt,
    };
  }

  async validateSession(sessionId: string, userId: string) {
    await this.redisService.ensureReady();
    const session = await this.getSession(sessionId);

    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('Session expired or invalid.');
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await this.revokeSession(sessionId, userId);
      throw new UnauthorizedException('Session expired or invalid.');
    }

    return session;
  }

  async rotateRefreshToken(sessionId: string, nextRefreshToken: string, expiresAt: Date) {
    await this.redisService.ensureReady();
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new UnauthorizedException('Session expired or invalid.');
    }

    const nowIso = new Date().toISOString();
    const ttlSeconds = this.getTtlSeconds(expiresAt);
    const multi = this.redisService.command.multi();
    multi.hset(this.sessionKey(sessionId), {
      expiresAt: expiresAt.toISOString(),
      lastSeenAt: nowIso,
    });
    multi.expire(this.sessionKey(sessionId), ttlSeconds);
    multi.set(this.refreshTokenKey(nextRefreshToken), sessionId, 'EX', ttlSeconds);
    multi.sadd(this.userSessionsKey(session.userId), sessionId);
    multi.expire(this.userSessionsKey(session.userId), ttlSeconds);
    await multi.exec();
  }

  async consumeRefreshToken(refreshToken: string) {
    await this.redisService.ensureReady();
    const key = this.refreshTokenKey(refreshToken);
    const sessionId = await this.redisService.command.get(key);

    if (!sessionId) {
      return null;
    }

    await this.redisService.command.del(key);
    return sessionId;
  }

  async revokeSession(sessionId: string, userId?: string | null) {
    await this.redisService.ensureReady();
    const key = this.sessionKey(sessionId);
    const session = await this.getSession(sessionId);
    const resolvedUserId = userId ?? session?.userId ?? null;

    const multi = this.redisService.command.multi();
    multi.del(key);
    if (resolvedUserId) {
      multi.srem(this.userSessionsKey(resolvedUserId), sessionId);
    }
    await multi.exec();
  }

  async revokeAllUserSessions(userId: string) {
    await this.redisService.ensureReady();
    const setKey = this.userSessionsKey(userId);
    const sessionIds = await this.redisService.command.smembers(setKey);

    if (sessionIds.length > 0) {
      const multi = this.redisService.command.multi();
      for (const sessionId of sessionIds) {
        multi.del(this.sessionKey(sessionId));
      }
      multi.del(setKey);
      await multi.exec();
      return;
    }

    await this.redisService.command.del(setKey);
  }

  async listUserSessions(userId: string, currentSessionId?: string | null) {
    await this.redisService.ensureReady();
    const sessionIds = await this.redisService.command.smembers(this.userSessionsKey(userId));

    if (sessionIds.length === 0) {
      return [] as ListedAuthSessionRecord[];
    }

    const sessions = await Promise.all(sessionIds.map((sessionId) => this.getSession(sessionId)));
    const activeSessions = sessions
      .filter((session): session is AuthSessionRecord => Boolean(session))
      .filter((session) => new Date(session.expiresAt).getTime() > Date.now())
      .sort(
        (a, b) =>
          new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime(),
      )
      .map((session) => ({
        ...session,
        current: Boolean(currentSessionId) && session.id === currentSessionId,
      }));

    const activeIds = new Set(activeSessions.map((session) => session.id));
    const staleIds = sessionIds.filter((sessionId) => !activeIds.has(sessionId));
    if (staleIds.length > 0) {
      const multi = this.redisService.command.multi();
      for (const sessionId of staleIds) {
        multi.srem(this.userSessionsKey(userId), sessionId);
      }
      await multi.exec();
    }

    return activeSessions;
  }

  async revokeOtherUserSessions(userId: string, currentSessionId?: string | null) {
    await this.redisService.ensureReady();
    const sessionIds = await this.redisService.command.smembers(this.userSessionsKey(userId));

    const targetIds = sessionIds.filter((sessionId) => sessionId !== currentSessionId);
    if (targetIds.length === 0) {
      return 0;
    }

    const multi = this.redisService.command.multi();
    for (const sessionId of targetIds) {
      multi.del(this.sessionKey(sessionId));
      multi.srem(this.userSessionsKey(userId), sessionId);
    }
    await multi.exec();
    return targetIds.length;
  }

  async touchSession(sessionId: string) {
    await this.redisService.ensureReady();
    const key = this.sessionKey(sessionId);
    const exists = await this.redisService.command.exists(key);
    if (!exists) {
      return;
    }

    await this.redisService.command.hset(key, {
      lastSeenAt: new Date().toISOString(),
    });
  }

  private async getSession(sessionId: string): Promise<AuthSessionRecord | null> {
    const values = await this.redisService.command.hgetall(this.sessionKey(sessionId));
    if (!values || Object.keys(values).length === 0) {
      return null;
    }

    return {
      id: values.id,
      userId: values.userId,
      hotelId: values.hotelId || null,
      impersonatorId: values.impersonatorId || null,
      isImpersonation: values.isImpersonation === 'true',
      ipAddress: values.ipAddress || null,
      userAgent: values.userAgent || null,
      createdAt: values.createdAt,
      lastSeenAt: values.lastSeenAt,
      expiresAt: values.expiresAt,
    };
  }

  private serializeSession(session: AuthSessionRecord) {
    return {
      ...session,
      hotelId: session.hotelId ?? '',
      impersonatorId: session.impersonatorId ?? '',
      ipAddress: session.ipAddress ?? '',
      userAgent: session.userAgent ?? '',
      isImpersonation: String(session.isImpersonation),
    };
  }

  private sessionKey(sessionId: string) {
    return `auth:session:${sessionId}`;
  }

  private userSessionsKey(userId: string) {
    return `auth:user-sessions:${userId}`;
  }

  private refreshTokenKey(refreshToken: string) {
    const digest = crypto.createHash('sha256').update(refreshToken).digest('hex');
    return `auth:refresh:${digest}`;
  }

  private getTtlSeconds(expiresAt: Date) {
    return Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
  }

  private parseDurationMs(value: string, fallback: number) {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d+)(ms|s|m|h|d)?$/i);

    if (!match) {
      return fallback;
    }

    const amount = Number(match[1]);
    const unit = (match[2] || 'ms').toLowerCase();

    switch (unit) {
      case 'ms':
        return amount;
      case 's':
        return amount * 1000;
      case 'm':
        return amount * 60 * 1000;
      case 'h':
        return amount * 60 * 60 * 1000;
      case 'd':
        return amount * 24 * 60 * 60 * 1000;
      default:
        return fallback;
    }
  }
}
