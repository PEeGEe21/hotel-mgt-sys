require('ts-node/register/transpile-only');
require('./helpers/mock-prisma-client');

process.env.NODE_PATH = __dirname + '/../';
require('node:module').Module._initPaths();

const test = require('node:test');
const assert = require('node:assert/strict');
const { ReservationsService } = require('../src/modules/reservations/services/reservations.service');

function createService(overrides = {}) {
  const prisma = {
    hotel: {
      findUnique: async () => ({
        id: 'hotel-1',
        name: 'Hotel Alpha',
        defaultCheckoutHour: 12,
        defaultCheckoutMinute: 0,
      }),
      ...overrides.hotel,
    },
    reservation: {
      update: async ({ data }) => ({
        id: 'reservation-1',
        reservationNo: 'RES-001',
        roomId: data.roomId ?? 'room-1',
        status: data.status ?? 'CHECKED_IN',
        guest: { firstName: 'Ada', lastName: 'Guest' },
        room: { number: data.roomId === 'room-2' ? '102' : '101' },
      }),
      ...overrides.reservation,
    },
    room: {
      update: async () => ({}),
      ...overrides.room,
    },
    keycard: {
      findMany: async () => [],
      ...overrides.keycard,
    },
    $transaction: async (value) => {
      if (typeof value === 'function') {
        return value(prisma);
      }
      return value;
    },
    ...overrides.prisma,
  };

  const ledger = { postFolioCharge: async () => ({}) };
  const notifications = { dispatch: async () => ({}) };
  const email = {};
  const keycardsService = {
    revokeAllForReservation: async () => ({}),
    revoke: async () => ({}),
    issue: async () => ({}),
    ...overrides.keycardsService,
  };

  const service = new ReservationsService(prisma, ledger, notifications, email, keycardsService);

  service.findOne = overrides.findOne
    ? overrides.findOne
    : async () => ({
        id: 'reservation-1',
        reservationNo: 'RES-001',
        roomId: 'room-1',
        checkIn: new Date('2026-06-01T14:00:00.000Z'),
        checkOut: new Date('2026-06-03T12:00:00.000Z'),
        status: 'CHECKED_IN',
        guest: { firstName: 'Ada', lastName: 'Guest' },
        room: { number: '101', type: 'Deluxe' },
      });
  service.assertGuestBelongsToHotel = async () => {};
  service.assertCompanyBelongsToHotel = async () => {};
  service.assertGroupBookingBelongsToHotel = async () => {};
  service.getAvailableRoomForReservation = async () => ({ id: 'room-2' });

  return { service, prisma, keycardsService };
}

test('checkOut revokes all reservation keycards with checkout reason', async () => {
  const calls = [];
  const { service } = createService({
    keycardsService: {
      revokeAllForReservation: async (...args) => {
        calls.push(args);
        return {};
      },
    },
  });

  const updated = await service.checkOut('hotel-1', 'reservation-1', 'user-1');

  assert.equal(updated.status, 'CHECKED_OUT');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'hotel-1');
  assert.equal(calls[0][1], 'user-1');
  assert.equal(calls[0][2], 'reservation-1');
  assert.equal(calls[0][3].reason, 'checkout');
});

test('cancel revokes prepared reservation keycards with cancellation reason', async () => {
  const calls = [];
  const { service } = createService({
    findOne: async () => ({
      id: 'reservation-1',
      reservationNo: 'RES-001',
      roomId: 'room-1',
      checkIn: new Date('2026-06-01T14:00:00.000Z'),
      checkOut: new Date('2026-06-03T12:00:00.000Z'),
      status: 'CONFIRMED',
      guest: { firstName: 'Ada', lastName: 'Guest' },
      room: { number: '101', type: 'Deluxe' },
    }),
    keycardsService: {
      revokeAllForReservation: async (...args) => {
        calls.push(args);
        return {};
      },
    },
  });

  const updated = await service.cancel('hotel-1', 'reservation-1', 'user-1');

  assert.equal(updated.status, 'CANCELLED');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][3].reason, 'reservation_cancelled');
});

test('checked-in room move revokes old keycards and issues replacements for new room', async () => {
  const revokeCalls = [];
  const issueCalls = [];
  const roomUpdates = [];

  const { service } = createService({
    keycard: {
      findMany: async () => [
        {
          id: 'keycard-1',
          guestId: 'guest-1',
          cardUid: 'CARD-001',
          type: 'PHYSICAL',
          validUntil: new Date('2026-06-03T12:00:00.000Z'),
        },
      ],
    },
    room: {
      update: async ({ where, data }) => {
        roomUpdates.push({ id: where.id, status: data.status });
        return {};
      },
    },
    reservation: {
      update: async ({ data }) => ({
        id: 'reservation-1',
        reservationNo: 'RES-001',
        roomId: data.roomId ?? 'room-2',
        status: 'CHECKED_IN',
        guest: { firstName: 'Ada', lastName: 'Guest' },
        room: { number: '102' },
      }),
    },
    keycardsService: {
      revoke: async (...args) => {
        revokeCalls.push(args);
        return {};
      },
      issue: async (...args) => {
        issueCalls.push(args);
        return {};
      },
    },
  });

  const updated = await service.update(
    'hotel-1',
    'reservation-1',
    { roomId: 'room-2' },
    'user-1',
    'staff-1',
  );

  assert.equal(updated.roomId, 'room-2');
  assert.deepEqual(roomUpdates, [
    { id: 'room-1', status: 'DIRTY' },
    { id: 'room-2', status: 'OCCUPIED' },
  ]);
  assert.equal(revokeCalls.length, 1);
  assert.equal(revokeCalls[0][2], 'keycard-1');
  assert.equal(revokeCalls[0][3].reason, 'room_move_reissue');
  assert.equal(issueCalls.length, 1);
  assert.equal(issueCalls[0][3].roomId, 'room-2');
  assert.equal(issueCalls[0][3].guestId, 'guest-1');
  assert.equal(issueCalls[0][3].cardUid, 'CARD-001');
});
