require('ts-node/register/transpile-only');
require('./helpers/mock-prisma-client');
process.env.NODE_PATH = __dirname + '/../';
require('node:module').Module._initPaths();

const test = require('node:test');
const assert = require('node:assert/strict');
const { KeycardsService } = require('../src/modules/keycards/services/keycards.service');
const { MockLockProvider } = require('../src/modules/keycards/providers/mock-lock.provider');

function createService(overrides = {}) {
  const createdKeycards = [];
  const updatedKeycards = [];
  const auditEntries = [];
  const prisma = {
    hotel: {
      findUnique: async () => ({
        id: 'hotel-1',
        keycardAuthEnabled: true,
        lockVendor: 'MOCK',
        lockApiKey: null,
        lockApiConfig: null,
      }),
      ...overrides.hotel,
    },
    featureFlag: {
      findUnique: async () => ({ key: 'keycard_auth', enabled: true }),
      ...overrides.featureFlag,
    },
    reservation: {
      findFirst: async () => ({
        id: 'reservation-1',
        hotelId: 'hotel-1',
        reservationNo: 'RES-001',
        status: 'CONFIRMED',
        roomId: 'room-1',
        checkIn: new Date('2026-06-01T14:00:00.000Z'),
        checkOut: new Date('2026-06-03T11:00:00.000Z'),
        room: {
          id: 'room-1',
          number: '101',
          lockDeviceId: 'lock-101',
          lockVendor: 'MOCK',
        },
        guestId: 'guest-primary',
        guest: {
          id: 'guest-primary',
          firstName: 'Ada',
          lastName: 'Primary',
        },
        guests: [
          {
            guestId: 'guest-primary',
            guest: {
              id: 'guest-primary',
              firstName: 'Ada',
              lastName: 'Primary',
            },
          },
          {
            guestId: 'guest-secondary',
            guest: {
              id: 'guest-secondary',
              firstName: 'Ben',
              lastName: 'Secondary',
            },
          },
        ],
      }),
      ...overrides.reservation,
    },
    keycard: {
      findFirst: async () => null,
      create: async ({ data }) => {
        const record = {
          id: `keycard-${createdKeycards.length + 1}`,
          ...data,
        };
        createdKeycards.push(record);
        return record;
      },
      update: async ({ where, data }) => {
        const existing =
          createdKeycards.find((entry) => entry.id === where.id) ??
          updatedKeycards.find((entry) => entry.id === where.id) ??
          { id: where.id };
        const record = {
          ...existing,
          ...data,
        };
        updatedKeycards.push(record);
        return record;
      },
      ...overrides.keycard,
    },
    auditLog: {
      create: async ({ data }) => {
        auditEntries.push(data);
        return data;
      },
      ...overrides.auditLog,
    },
    $transaction: async (work) => work(prisma),
    ...overrides.prisma,
  };

  const mockLockProvider = overrides.mockLockProvider ?? new MockLockProvider();
  const lockProviderFactory = {
    resolve: () => mockLockProvider,
    ...overrides.lockProviderFactory,
  };

  return {
    service: new KeycardsService(prisma, lockProviderFactory),
    mockLockProvider,
    createdKeycards,
    updatedKeycards,
    auditEntries,
  };
}

test('issue rejects a guest that is not attached to the reservation', async () => {
  const { service } = createService();

  await assert.rejects(
    () =>
      service.issue(
        'hotel-1',
        'user-1',
        'staff-1',
        {
          reservationId: 'reservation-1',
          roomId: 'room-1',
          guestId: 'guest-outsider',
        },
        {},
      ),
    (error) => {
      assert.equal(error?.message, 'Guest is not attached to this reservation.');
      return true;
    },
  );
});

test('issue rejects confirmed reservation keycards that become valid before check-in', async () => {
  const { service } = createService();

  await assert.rejects(
    () =>
      service.issue(
        'hotel-1',
        'user-1',
        'staff-1',
        {
          reservationId: 'reservation-1',
          roomId: 'room-1',
          validFrom: '2026-06-01T13:00:00.000Z',
        },
        {},
      ),
    (error) => {
      assert.equal(
        error?.message,
        'Keycard validFrom cannot be earlier than the reservation check-in time.',
      );
      return true;
    },
  );
});

test('issue rejects a room that does not match the reservation room', async () => {
  const { service } = createService();

  await assert.rejects(
    () =>
      service.issue(
        'hotel-1',
        'user-1',
        'staff-1',
        {
          reservationId: 'reservation-1',
          roomId: 'room-2',
        },
        {},
      ),
    (error) => {
      assert.equal(error?.message, 'Room does not match reservation.');
      return true;
    },
  );
});

test('issue rejects keycards that outlive the reservation checkout time', async () => {
  const { service } = createService();

  await assert.rejects(
    () =>
      service.issue(
        'hotel-1',
        'user-1',
        'staff-1',
        {
          reservationId: 'reservation-1',
          roomId: 'room-1',
          validUntil: '2026-06-03T12:00:00.000Z',
        },
        {},
      ),
    (error) => {
      assert.equal(
        error?.message,
        'Keycard validUntil cannot exceed the reservation checkout time.',
      );
      return true;
    },
  );
});

test('issue rejects duplicate active keycards for the same reservation guest', async () => {
  const { service } = createService({
    keycard: {
      findFirst: async ({ where }) => {
        if (where?.status?.in?.includes('ACTIVE')) {
          return { id: 'keycard-existing' };
        }

        return null;
      },
    },
  });

  await assert.rejects(
    () =>
      service.issue(
        'hotel-1',
        'user-1',
        'staff-1',
        {
          reservationId: 'reservation-1',
          roomId: 'room-1',
          guestId: 'guest-secondary',
        },
        {},
      ),
    (error) => {
      assert.equal(error?.message, 'An active keycard already exists for this guest.');
      return true;
    },
  );
});

test('issue rejects when the platform feature flag is disabled', async () => {
  const { service } = createService({
    featureFlag: {
      findUnique: async () => ({ key: 'keycard_auth', enabled: false }),
    },
  });

  await assert.rejects(
    () =>
      service.issue(
        'hotel-1',
        'user-1',
        'staff-1',
        {
          reservationId: 'reservation-1',
          roomId: 'room-1',
        },
        {},
      ),
    (error) => {
      assert.equal(error?.message, 'Keycard auth is not enabled.');
      return true;
    },
  );
});

test('issue rejects when the hotel keycard entitlement is disabled', async () => {
  const { service } = createService({
    hotel: {
      findUnique: async () => ({
        id: 'hotel-1',
        keycardAuthEnabled: false,
        lockVendor: 'MOCK',
        lockApiKey: null,
        lockApiConfig: null,
      }),
    },
  });

  await assert.rejects(
    () =>
      service.issue(
        'hotel-1',
        'user-1',
        'staff-1',
        {
          reservationId: 'reservation-1',
          roomId: 'room-1',
        },
        {},
      ),
    (error) => {
      assert.equal(error?.message, 'Keycard auth is not enabled for this hotel.');
      return true;
    },
  );
});

test('issue uses secondary reservation guest details for mock provisioning activity', async () => {
  const { service, mockLockProvider, createdKeycards, updatedKeycards } = createService();

  const keycard = await service.issue(
    'hotel-1',
    'user-1',
    'staff-1',
    {
      reservationId: 'reservation-1',
      roomId: 'room-1',
      guestId: 'guest-secondary',
    },
    {},
  );

  assert.equal(keycard.guestId, 'guest-secondary');
  assert.equal(createdKeycards[0].status, 'PENDING');
  assert.equal(updatedKeycards[0].status, 'ACTIVE');
  const activity = mockLockProvider.getProvisioningActivity();
  assert.equal(activity.length, 1);
  assert.equal(activity[0].type, 'ISSUE');
  assert.equal(activity[0].hotelId, 'hotel-1');
  assert.equal(activity[0].reservationId, 'reservation-1');
  assert.equal(activity[0].roomId, 'room-1');
  assert.equal(activity[0].guestName, 'Ben Secondary');
});

test('issue marks the persisted keycard as failed when provider provisioning fails', async () => {
  const issueError = new Error('provider offline');
  const { service, createdKeycards, updatedKeycards, auditEntries } = createService({
    lockProviderFactory: {
      resolve: () => ({
        issueKey: async () => {
          throw issueError;
        },
        revokeKey: async () => undefined,
      }),
    },
  });

  await assert.rejects(
    () =>
      service.issue(
        'hotel-1',
        'user-1',
        'staff-1',
        {
          reservationId: 'reservation-1',
          roomId: 'room-1',
        },
        {},
      ),
    (error) => error === issueError,
  );

  assert.equal(createdKeycards[0].status, 'PENDING');
  assert.equal(updatedKeycards[0].status, 'FAILED');
  assert.equal(auditEntries[0].action, 'keycard.issue_failed');
  assert.equal(auditEntries[0].metadata.stage, 'provider_issue');
});

test('mock lock provider records issue and revoke provisioning activity', async () => {
  const provider = new MockLockProvider();

  await provider.issueKey({
    hotelId: 'hotel-1',
    reservationId: 'reservation-1',
    roomId: 'room-1',
    accessToken: 'abcdefghijklmnopqrstuvwxyz',
    lockDeviceId: 'lock-101',
    validFrom: new Date('2026-06-01T14:00:00.000Z'),
    validUntil: new Date('2026-06-03T11:00:00.000Z'),
    guestName: 'Ada Primary',
  });
  await provider.revokeKey('abcdefghijklmnopqrstuvwxyz', 'lock-101');

  const activity = provider.getProvisioningActivity();
  assert.equal(activity.length, 2);
  assert.deepEqual(
    activity.map((entry) => entry.type),
    ['ISSUE', 'REVOKE'],
  );
  assert.equal(activity[0].accessTokenPreview, 'abcdefghij...');
  assert.equal(activity[1].lockDeviceId, 'lock-101');
});

test('ingestAccessEvent records a granted event for a known active keycard', async () => {
  let capturedLog = null;

  const { service } = createService({
    keycard: {
      findFirst: async () => ({
        id: 'keycard-1',
        hotelId: 'hotel-1',
        roomId: 'room-1',
        accessToken: 'known-token',
        status: 'ACTIVE',
        validUntil: new Date('2026-06-03T11:00:00.000Z'),
      }),
    },
    prisma: {
      keycardAccessLog: {
        create: async ({ data }) => {
          capturedLog = data;
          return { id: 'log-1', ...data };
        },
      },
    },
  });

  const log = await service.ingestAccessEvent(
    'hotel-1',
    'user-1',
    {
      accessToken: 'known-token',
      deviceId: 'lock-101',
      occurredAt: '2026-06-02T09:00:00.000Z',
    },
    {},
  );

  assert.equal(log.result, 'GRANTED');
  assert.equal(capturedLog.keycardId, 'keycard-1');
  assert.equal(capturedLog.roomId, 'room-1');
  assert.equal(capturedLog.method, 'VENDOR_SYNC');
});

test('ingestAccessEvent records denied unknown-token events without foreign keys', async () => {
  let capturedLog = null;

  const { service } = createService({
    keycard: {
      findFirst: async () => null,
    },
    prisma: {
      keycardAccessLog: {
        create: async ({ data }) => {
          capturedLog = data;
          return { id: 'log-2', ...data };
        },
      },
    },
  });

  const log = await service.ingestAccessEvent(
    'hotel-1',
    'user-1',
    {
      accessToken: 'unknown-token',
      result: 'DENIED',
      reason: 'invalid_token',
      vendorEventId: 'vendor-event-123',
    },
    {},
  );

  assert.equal(log.result, 'DENIED');
  assert.equal(capturedLog.keycardId, null);
  assert.equal(capturedLog.roomId, null);
  assert.equal(capturedLog.hotelId, 'hotel-1');
  assert.equal(capturedLog.vendorEventId, 'vendor-event-123');
});

test('reportLost marks an active keycard as lost and revokes provider access', async () => {
  let capturedUpdate = null;
  const mockLockProvider = new MockLockProvider();

  const { service } = createService({
    mockLockProvider,
    keycard: {
      findFirst: async () => ({
        id: 'keycard-1',
        hotelId: 'hotel-1',
        roomId: 'room-1',
        accessToken: 'known-token',
        status: 'ACTIVE',
        room: {
          number: '101',
          lockDeviceId: 'lock-101',
          lockVendor: 'MOCK',
        },
        reservation: {
          id: 'reservation-1',
          reservationNo: 'RES-001',
        },
      }),
      update: async ({ data }) => {
        capturedUpdate = data;
        return { id: 'keycard-1', ...data };
      },
    },
  });

  const result = await service.reportLost(
    'hotel-1',
    'user-1',
    'keycard-1',
    { reason: 'guest reported missing card' },
    {},
  );

  assert.equal(result.status, 'LOST');
  assert.equal(capturedUpdate.revokedReason, 'guest reported missing card');
  const activity = mockLockProvider.getProvisioningActivity();
  assert.equal(activity.at(-1).type, 'REVOKE');
});
