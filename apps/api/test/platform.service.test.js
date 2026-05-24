require('ts-node/register/transpile-only');
require('./helpers/mock-prisma-client');

const test = require('node:test');
const assert = require('node:assert/strict');
const { PlatformService } = require('../src/modules/platform/platform.service');

function createService(overrides = {}) {
  const prisma = {
    hotel: {
      findUnique: async () => null,
      update: async () => {
        throw new Error('hotel.update mock not provided');
      },
      findMany: async () => [],
      count: async () => 0,
      findFirst: async () => null,
      ...overrides.hotel,
    },
    user: {
      findUnique: async () => null,
      findFirst: async () => null,
      findMany: async () => [],
      count: async () => 0,
      ...overrides.user,
    },
    staff: {
      findFirst: async () => null,
      findMany: async () => [],
      findUnique: async () => null,
      ...overrides.staff,
    },
    reservation: {
      findMany: async () => [],
      count: async () => 0,
      findFirst: async () => null,
      ...overrides.reservation,
    },
    room: {
      findMany: async () => [],
      count: async () => 0,
      ...overrides.room,
    },
    keycardAccessLog: {
      count: async () => 0,
      groupBy: async () => [],
      findMany: async () => [],
      ...overrides.keycardAccessLog,
    },
    invoice: {
      count: async () => 0,
      ...overrides.invoice,
    },
    auditLog: {
      create: async () => ({}),
      findMany: async () => [],
      count: async () => 0,
      ...overrides.auditLog,
    },
    $queryRaw: async () => [],
    $transaction: async (value) => {
      if (typeof value === 'function') {
        return value(prisma);
      }
      return value;
    },
    ...overrides.prisma,
  };

  const hotelLifecycleService = {
    deriveOnboardingStatus: () => 'ACTIVE',
    syncOnboardingStatus: async () => ({ onboardingStatus: 'ACTIVE' }),
    ...overrides.hotelLifecycleService,
  };

  const email = {
    sendEmail: async () => ({}),
    ...overrides.email,
  };

  return new PlatformService(prisma, hotelLifecycleService, email);
}

test('suspendHotel rejects when confirmation name does not match hotel name', async () => {
  const service = createService({
    hotel: {
      findUnique: async () => ({
        id: 'hotel-1',
        name: 'Hotel Alpha',
        suspendedAt: null,
      }),
    },
  });

  await assert.rejects(
    () =>
      service.suspendHotel('admin-1', 'hotel-1', {
        confirmationName: 'Wrong Hotel',
        reason: 'Fraud review',
      }),
    (error) => {
      assert.equal(error?.message, 'Confirmation name did not match the hotel name.');
      return true;
    },
  );
});

test('suspendHotel rejects when reason is missing', async () => {
  const service = createService({
    hotel: {
      findUnique: async () => ({
        id: 'hotel-1',
        name: 'Hotel Alpha',
        suspendedAt: null,
      }),
    },
  });

  await assert.rejects(
    () =>
      service.suspendHotel('admin-1', 'hotel-1', {
        confirmationName: 'Hotel Alpha',
        reason: '   ',
      }),
    (error) => {
      assert.equal(error?.message, 'A suspension reason is required.');
      return true;
    },
  );
});

test('reactivateHotel rejects when confirmation name does not match hotel name', async () => {
  const service = createService({
    hotel: {
      findUnique: async () => ({
        id: 'hotel-1',
        name: 'Hotel Alpha',
        suspendedAt: new Date('2026-05-01T00:00:00.000Z'),
        onboardingStatus: 'PENDING_SETUP',
      }),
    },
  });

  await assert.rejects(
    () =>
      service.reactivateHotel('admin-1', 'hotel-1', {
        confirmationName: 'Hotel Beta',
        reason: 'Issue resolved',
      }),
    (error) => {
      assert.equal(error?.message, 'Confirmation name did not match the hotel name.');
      return true;
    },
  );
});

test('softDeleteHotel sets delete metadata and a purge deadline', async () => {
  let capturedUpdate = null;
  let capturedAudit = null;

  const service = createService({
    hotel: {
      findUnique: async () => ({
        id: 'hotel-1',
        name: 'Hotel Alpha',
        suspendedAt: null,
        suspensionReason: null,
        deletedAt: null,
        purgeAfterAt: null,
        onboardingStatus: 'ACTIVE',
      }),
      update: async ({ data }) => {
        capturedUpdate = data;
        return {
          id: 'hotel-1',
          name: 'Hotel Alpha',
          suspendedAt: data.suspendedAt,
          suspensionReason: data.suspensionReason,
          deletedAt: data.deletedAt,
          purgeAfterAt: data.purgeAfterAt,
          onboardingStatus: 'ACTIVE',
        };
      },
    },
    auditLog: {
      create: async ({ data }) => {
        capturedAudit = data;
        return data;
      },
    },
  });

  let queryCount = 0;
  service.prisma.$queryRaw = async (...args) => {
    queryCount += 1;
    if (queryCount === 1) {
      return [];
    }

    const values = args.slice(1);
    capturedUpdate = {
      deletedAt: values[0],
      purgeAfterAt: values[1],
      suspendedAt: values[2],
      suspensionReason: values[3],
    };

    return [
      {
        id: 'hotel-1',
        name: 'Hotel Alpha',
        suspendedAt: capturedUpdate.suspendedAt,
        suspensionReason: capturedUpdate.suspensionReason,
        deletedAt: capturedUpdate.deletedAt,
        purgeAfterAt: capturedUpdate.purgeAfterAt,
        onboardingStatus: 'ACTIVE',
      },
    ];
  };

  const result = await service.softDeleteHotel('admin-1', 'hotel-1', {
    confirmationName: 'Hotel Alpha',
    reason: 'Tenant requested closure',
  });

  assert.ok(capturedUpdate.deletedAt instanceof Date);
  assert.ok(capturedUpdate.purgeAfterAt instanceof Date);
  assert.equal(capturedUpdate.suspensionReason, 'Tenant requested closure');
  assert.equal(capturedAudit.action, 'platform.hotel.soft_delete');
  assert.equal(result.name, 'Hotel Alpha');
});

test('restoreHotel clears delete metadata for a soft-deleted hotel', async () => {
  let capturedUpdate = null;

  const service = createService({
    hotel: {
      findUnique: async () => ({
        id: 'hotel-1',
        name: 'Hotel Alpha',
        deletedAt: new Date('2026-05-22T00:00:00.000Z'),
        purgeAfterAt: new Date('2026-06-21T00:00:00.000Z'),
        suspendedAt: new Date('2026-05-22T00:00:00.000Z'),
        onboardingStatus: 'ACTIVE',
      }),
      update: async ({ data }) => {
        capturedUpdate = data;
        return {
          id: 'hotel-1',
          name: 'Hotel Alpha',
          suspendedAt: new Date('2026-05-22T00:00:00.000Z'),
          suspensionReason: 'Tenant requested closure',
          deletedAt: data.deletedAt,
          purgeAfterAt: data.purgeAfterAt,
        };
      },
    },
  });

  const result = await service.restoreHotel('admin-1', 'hotel-1', {
    confirmationName: 'Hotel Alpha',
    reason: 'Tenant restored after review',
  });

  assert.deepEqual(capturedUpdate, {
    deletedAt: null,
    purgeAfterAt: null,
  });
  assert.equal(result.deletedAt, null);
  assert.equal(result.purgeAfterAt, null);
});

test('updateHotel trims and persists normalized fields for valid profile edits', async () => {
  let capturedUpdate = null;
  let capturedAudit = null;

  const service = createService({
    hotel: {
      findUnique: async ({ where }) => {
        if (where.id) {
          return {
            id: 'hotel-1',
            name: 'Hotel Alpha',
            domain: 'alpha',
            address: 'Old address',
            city: 'Lagos',
            state: 'Lagos',
            country: 'Nigeria',
            phone: '+234000000',
            email: 'hello@alpha.com',
            website: 'https://alpha.example',
            description: 'Old',
            currency: 'NGN',
            timezone: 'Africa/Lagos',
          };
        }

        return null;
      },
      update: async ({ data }) => {
        capturedUpdate = data;
        return { id: 'hotel-1' };
      },
    },
    auditLog: {
      create: async ({ data }) => {
        capturedAudit = data;
        return data;
      },
    },
    hotelLifecycleService: {
      deriveOnboardingStatus: () => 'ACTIVE',
    },
  });

  service.getHotelDetail = async () => ({ id: 'hotel-1', name: 'Hotel Alpha Prime' });

  const result = await service.updateHotel('admin-1', 'hotel-1', {
    name: '  Hotel Alpha Prime  ',
    domain: '  Alpha-Prime  ',
    website: '   ',
    email: '  OPS@ALPHA.COM ',
    currency: ' usd ',
  });

  assert.deepEqual(capturedUpdate, {
    name: 'Hotel Alpha Prime',
    domain: 'alpha-prime',
    website: null,
    email: 'ops@alpha.com',
    currency: 'USD',
  });
  assert.equal(capturedAudit.action, 'platform.hotel.update');
  assert.deepEqual(result, { id: 'hotel-1', name: 'Hotel Alpha Prime' });
});

test('listHotels includes derived warning health when activity is stale and invoices are overdue', async () => {
  const service = createService({
    hotel: {
      findMany: async () => [
        {
          id: 'hotel-1',
          name: 'Hotel Alpha',
          domain: 'alpha',
          city: 'Lagos',
          country: 'Nigeria',
          email: 'hello@alpha.com',
          phone: '+234000000',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-05-01T00:00:00.000Z'),
          onboardingStatus: 'ACTIVE',
          suspendedAt: null,
          suspensionReason: null,
          deletedAt: null,
          purgeAfterAt: null,
          _count: { rooms: 10, staff: 5, reservations: 12 },
        },
      ],
      count: async () => 1,
    },
    user: {
      findFirst: async () => ({
        id: 'admin-1',
        email: 'admin@alpha.com',
        isActive: true,
        staff: { firstName: 'Ada', lastName: 'Admin' },
      }),
    },
    staff: {
      findFirst: async () => ({
        user: { lastLoginAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
      }),
    },
    reservation: {
      findFirst: async () => ({
        createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      }),
    },
    prisma: {
      invoice: {
        count: async () => 2,
      },
    },
  });

  const result = await service.listHotels({ page: 1, limit: 20 });
  assert.equal(result.hotels[0].health.status, 'warning');
  assert.equal(result.hotels[0].health.overdueInvoices, 2);
  assert.ok(result.hotels[0].health.score < 80);
});

test('getStats includes keycard rollout and failure signals', async () => {
  const service = createService({
    hotel: {
      count: async ({ where } = {}) => {
        if (where?.suspendedAt) return 1;
        if (where?.staff?.none) return 2;
        return 4;
      },
      findMany: async ({ where } = {}) => {
        if (where?.keycardAuthEnabled) {
          return [
            {
              id: 'hotel-1',
              name: 'Hotel Alpha',
              lockVendor: 'MOCK',
              rooms: [{ id: 'room-1', lockDeviceId: 'lock-1' }, { id: 'room-2', lockDeviceId: null }],
            },
            {
              id: 'hotel-2',
              name: 'Hotel Beta',
              lockVendor: 'VINGCARD',
              rooms: [{ id: 'room-3', lockDeviceId: 'lock-3' }],
            },
          ];
        }

        return [
          { id: 'hotel-1', name: 'Hotel Alpha' },
          { id: 'hotel-2', name: 'Hotel Beta' },
        ];
      },
    },
    user: {
      count: async () => 10,
    },
    reservation: {
      count: async () => 6,
    },
    keycardAccessLog: {
      groupBy: async () => [
        { hotelId: 'hotel-1', _count: { _all: 5 } },
        { hotelId: 'hotel-2', _count: { _all: 1 } },
      ],
    },
  });

  const result = await service.getStats();

  assert.equal(result.keycards.enabledHotels, 2);
  assert.equal(result.keycards.mockProviderHotels, 1);
  assert.equal(result.keycards.liveProviderHotels, 1);
  assert.equal(result.keycards.hotelsWithMissingRoomLockMappings, 1);
  assert.equal(result.keycards.recentFailureEvents24h, 6);
  assert.equal(result.keycards.denialSpikeHotels[0].name, 'Hotel Alpha');
});

test('getHotelDetail includes keycard support signals and recent incident summaries', async () => {
  const service = createService({
    hotel: {
      findUnique: async () => ({
        id: 'hotel-1',
        name: 'Hotel Alpha',
        domain: 'alpha',
        address: '1 Street',
        city: 'Lagos',
        state: null,
        country: 'Nigeria',
        phone: '+234',
        email: 'hello@alpha.com',
        website: null,
        description: null,
        currency: 'NGN',
        timezone: 'Africa/Lagos',
        keycardAuthEnabled: true,
        lockVendor: 'VINGCARD',
        lockApiKey: null,
        lockApiConfig: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
        onboardingStatus: 'ACTIVE',
        suspendedAt: null,
        suspensionReason: null,
        deletedAt: null,
        purgeAfterAt: null,
        _count: { rooms: 2, staff: 3, guests: 5, reservations: 8, facilities: 1, invoices: 2, payments: 3 },
      }),
    },
    user: {
      findMany: async () => [],
    },
    staff: {
      findMany: async () => [],
    },
    reservation: {
      findMany: async () => [],
      findFirst: async () => ({ createdAt: new Date('2026-05-20T00:00:00.000Z') }),
    },
    invoice: {
      count: async () => 0,
    },
    room: {
      findMany: async () => [
        { id: 'room-1', number: '101', lockDeviceId: 'lock-101', lockVendor: null },
        { id: 'room-2', number: '102', lockDeviceId: null, lockVendor: null },
      ],
    },
    keycardAccessLog: {
      groupBy: async () => [
        { result: 'DENIED', _count: { _all: 2 } },
        { result: 'GRANTED', _count: { _all: 6 } },
        { result: 'UNKNOWN', _count: { _all: 1 } },
      ],
      findMany: async () => [
        {
          id: 'log-1',
          createdAt: new Date('2026-05-24T10:00:00.000Z'),
          result: 'DENIED',
          reason: 'device_not_mapped',
          deviceId: 'front-door',
          accessToken: 'abcdefgh12345678',
          room: { number: '102' },
        },
      ],
    },
  });

  const result = await service.getHotelDetail('hotel-1');

  assert.equal(result.keycards.providerMode, 'live');
  assert.equal(result.keycards.missingRoomLockMappings, 1);
  assert.equal(result.keycards.lockApiConfigured, false);
  assert.equal(result.keycards.accessSummary.denied24h, 2);
  assert.equal(result.keycards.supportSignals.configurationIssues.length > 0, true);
  assert.equal(result.keycards.accessSummary.recentEvents[0].diagnosis, 'configuration');
});
