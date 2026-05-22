require('ts-node/register/transpile-only');

const test = require('node:test');
const assert = require('node:assert/strict');
const { ForbiddenException } = require('@nestjs/common');
const { PermissionsGuard } = require('../src/modules/auth/guards/permissions.guard');

function createReflector(required) {
  return {
    getAllAndOverride() {
      return required;
    },
  };
}

function createContext(user) {
  return {
    getHandler() {
      return 'handler';
    },
    getClass() {
      return 'class';
    },
    switchToHttp() {
      return {
        getRequest() {
          return { user };
        },
      };
    },
  };
}

test('super admin can access platform route when the explicit platform permission exists', async () => {
  const guard = new PermissionsGuard(createReflector(['platform:view-audit']), {
    user: {
      findUnique: async () => ({
        role: 'SUPER_ADMIN',
        permissionGrants: [],
        permissionDenies: [],
        staff: null,
      }),
    },
  });

  const result = await guard.canActivate(createContext({ sub: 'user-1', role: 'SUPER_ADMIN' }));
  assert.equal(result, true);
});

test('super admin can be denied a platform route when the explicit platform permission is removed', async () => {
  const guard = new PermissionsGuard(createReflector(['platform:view-audit']), {
    user: {
      findUnique: async () => ({
        role: 'SUPER_ADMIN',
        permissionGrants: [],
        permissionDenies: ['platform:view-audit'],
        staff: null,
      }),
    },
    rolePermission: {
      findUnique: async () => null,
    },
  });

  await assert.rejects(
    () => guard.canActivate(createContext({ sub: 'user-1', role: 'SUPER_ADMIN' })),
    (error) => {
      assert.ok(error instanceof ForbiddenException);
      assert.equal(error.message, 'Insufficient permissions');
      return true;
    },
  );
});
