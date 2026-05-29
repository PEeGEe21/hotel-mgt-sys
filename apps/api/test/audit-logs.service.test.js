require('ts-node/register/transpile-only');
require('./helpers/mock-prisma-client');

const test = require('node:test');
const assert = require('node:assert/strict');
const { AuditLogsService } = require('../src/modules/audit-logs/audit-logs.service');

function createService(overrides = {}) {
  const prisma = {
    auditLog: {
      findMany: async () => [],
      count: async () => 0,
      ...overrides.auditLog,
    },
    ...overrides.prisma,
  };

  return new AuditLogsService(prisma);
}

test('list masks super admin identities in hotel audit logs', async () => {
  const createdAt = new Date('2026-05-29T09:00:00.000Z');

  const service = createService({
    auditLog: {
      findMany: async () => [
        {
          id: 'log-1',
          action: 'platform.support.case.update',
          targetType: 'SUPPORT_CASE',
          targetId: 'case-1',
          targetUserId: 'super-admin-1',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          metadata: null,
          createdAt,
          actor: {
            id: 'super-admin-1',
            email: 'super_admin@gmail.com',
            role: 'SUPER_ADMIN',
            staff: null,
          },
          targetUser: {
            id: 'super-admin-1',
            email: 'super_admin@gmail.com',
            role: 'SUPER_ADMIN',
            staff: null,
          },
        },
        {
          id: 'log-2',
          action: 'staff.update',
          targetType: 'USER',
          targetId: 'user-2',
          targetUserId: 'user-2',
          ipAddress: null,
          userAgent: null,
          metadata: null,
          createdAt,
          actor: {
            id: 'user-1',
            email: 'manager@hotel.test',
            role: 'ADMIN',
            staff: {
              firstName: 'Ada',
              lastName: 'Manager',
            },
          },
          targetUser: {
            id: 'user-2',
            email: 'frontdesk@hotel.test',
            role: 'STAFF',
            staff: {
              firstName: 'Tobi',
              lastName: 'Desk',
            },
          },
        },
      ],
      count: async () => 2,
    },
  });

  const result = await service.list({ hotelId: 'hotel-1' });

  assert.equal(result.logs[0].actor.name, 'Platform admin');
  assert.equal(result.logs[0].actor.email, 'Hidden');
  assert.equal(result.logs[0].targetUser.name, 'Platform admin');
  assert.equal(result.logs[0].targetUser.email, 'Hidden');

  assert.equal(result.logs[1].actor.name, 'Ada Manager');
  assert.equal(result.logs[1].actor.email, 'manager@hotel.test');
  assert.equal(result.logs[1].targetUser.name, 'Tobi Desk');
  assert.equal(result.logs[1].targetUser.email, 'frontdesk@hotel.test');
});
