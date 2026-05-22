require('ts-node/register/transpile-only');
require('./helpers/mock-prisma-client');

const test = require('node:test');
const assert = require('node:assert/strict');
const { AuthService } = require('../src/modules/auth/services/auth.service');

function createService(overrides = {}) {
  const prisma = {
    refreshToken: {
      findUnique: async () => null,
      delete: async () => ({}),
      create: async () => ({}),
      ...overrides.refreshToken,
    },
    auditLog: {
      create: async () => ({}),
      ...overrides.auditLog,
    },
    user: {
      update: async () => ({}),
      ...overrides.user,
    },
    ...overrides.prisma,
  };

  const jwt = {
    signAsync: async () => 'signed-token',
    ...overrides.jwt,
  };

  const config = {
    get(key, fallback) {
      if (key === 'JWT_SECRET') return 'test-secret';
      if (key === 'JWT_EXPIRES_IN') return '15m';
      return fallback;
    },
    ...overrides.config,
  };

  const email = { ...overrides.email };
  const realtimePresenceService = { ...overrides.realtimePresenceService };
  const authSessionService = {
    consumeRefreshToken: async () => null,
    createSession: async () => ({
      sessionId: 'session-1',
      expiresAt: new Date('2026-05-22T12:30:00.000Z'),
    }),
    validateSession: async () => ({
      id: 'session-1',
      userId: 'user-1',
      hotelId: 'hotel-1',
      impersonatorId: 'admin-1',
      isImpersonation: true,
      ipAddress: null,
      userAgent: null,
      createdAt: '2026-05-22T12:00:00.000Z',
      lastSeenAt: '2026-05-22T12:00:00.000Z',
      expiresAt: '2026-05-22T12:30:00.000Z',
    }),
    rotateRefreshToken: async () => {},
    ...overrides.authSessionService,
  };
  const cache = { ...overrides.cache };

  return new AuthService(prisma, jwt, config, email, realtimePresenceService, authSessionService, cache);
}

test('refresh keeps impersonation refresh token expiry aligned with impersonation session expiry', async () => {
  const createdRefreshTokens = [];
  const rotatedSessions = [];

  const service = createService({
    refreshToken: {
      findUnique: async () => ({
        token: 'refresh-token',
        expiresAt: new Date('2026-05-29T12:00:00.000Z'),
        impersonatorId: 'admin-1',
        isImpersonation: true,
        user: {
          id: 'user-1',
          email: 'manager@example.com',
          role: 'MANAGER',
          isActive: true,
          staff: { hotelId: 'hotel-1' },
        },
      }),
      create: async ({ data }) => {
        createdRefreshTokens.push(data);
        return data;
      },
    },
    authSessionService: {
      consumeRefreshToken: async () => 'session-1',
      validateSession: async () => ({
        id: 'session-1',
        userId: 'user-1',
        hotelId: 'hotel-1',
        impersonatorId: 'admin-1',
        isImpersonation: true,
        ipAddress: null,
        userAgent: null,
        createdAt: '2026-05-22T12:00:00.000Z',
        lastSeenAt: '2026-05-22T12:00:00.000Z',
        expiresAt: '2026-05-22T12:30:00.000Z',
      }),
      rotateRefreshToken: async (sessionId, refreshToken, expiresAt) => {
        rotatedSessions.push({ sessionId, refreshToken, expiresAt });
      },
    },
  });

  const result = await service.refresh('refresh-token');

  assert.equal(result.accessToken, 'signed-token');
  assert.equal(result.refreshToken.length, 128);
  assert.equal(createdRefreshTokens.length, 1);
  assert.equal(createdRefreshTokens[0].isImpersonation, true);
  assert.equal(createdRefreshTokens[0].expiresAt.toISOString(), '2026-05-22T12:30:00.000Z');
  assert.equal(rotatedSessions.length, 1);
  assert.equal(rotatedSessions[0].expiresAt.toISOString(), '2026-05-22T12:30:00.000Z');
});
