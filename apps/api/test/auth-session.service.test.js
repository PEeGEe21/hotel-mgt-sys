require('ts-node/register/transpile-only');

const test = require('node:test');
const assert = require('node:assert/strict');
const { AuthSessionService } = require('../src/modules/auth/services/auth-session.service');

function createRedisMock() {
  const state = {
    lastExpireValues: [],
    sessions: new Map(),
    sessionSets: new Map(),
  };

  const command = {
    multi() {
      const ops = [];
      return {
        hset(key, value) {
          ops.push(() => state.sessions.set(key, { ...(state.sessions.get(key) || {}), ...value }));
          return this;
        },
        expire(key, ttl) {
          ops.push(() => state.lastExpireValues.push({ key, ttl }));
          return this;
        },
        sadd(key, value) {
          ops.push(() => {
            const current = state.sessionSets.get(key) || new Set();
            current.add(value);
            state.sessionSets.set(key, current);
          });
          return this;
        },
        set() {
          return this;
        },
        del() {
          return this;
        },
        srem() {
          return this;
        },
        exec: async () => {
          for (const op of ops) op();
        },
      };
    },
    hgetall: async (key) => state.sessions.get(key) || {},
    smembers: async (key) => Array.from(state.sessionSets.get(key) || []),
    exists: async (key) => (state.sessions.has(key) ? 1 : 0),
    get: async () => null,
    eval: async () => [1, 1000],
  };

  return {
    state,
    service: {
      ensureReady: async () => {},
      command,
    },
  };
}

function createConfigMock() {
  return {
    get(key) {
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
      if (key === 'superAdmin.impersonationTtl') return '30m';
      return undefined;
    },
  };
}

test('impersonation sessions get a shorter TTL than regular sessions', async () => {
  const regularRedis = createRedisMock();
  const impersonationRedis = createRedisMock();

  const regularService = new AuthSessionService(regularRedis.service, createConfigMock());
  const impersonationService = new AuthSessionService(impersonationRedis.service, createConfigMock());

  const regular = await regularService.createSession({ userId: 'user-1' });
  const impersonation = await impersonationService.createSession({
    userId: 'user-2',
    impersonatorId: 'admin-1',
    isImpersonation: true,
  });

  const regularTtl = regular.expiresAt.getTime() - Date.now();
  const impersonationTtl = impersonation.expiresAt.getTime() - Date.now();

  assert.ok(regularTtl > 6 * 24 * 60 * 60 * 1000);
  assert.ok(impersonationTtl < 31 * 60 * 1000);
  assert.ok(impersonationTtl < regularTtl);
});
