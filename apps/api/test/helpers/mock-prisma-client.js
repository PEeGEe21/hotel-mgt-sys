const Module = require('node:module');

const originalLoad = Module._load;

class FakePrismaClient {
  async $connect() {}

  async $disconnect() {}
}

const ReservationStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
};

const PaymentStatus = {
  UNPAID: 'UNPAID',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  REFUNDED: 'REFUNDED',
};

const RoomStatus = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  OCCUPIED: 'OCCUPIED',
  DIRTY: 'DIRTY',
};

const BookingType = {
  INDIVIDUAL: 'INDIVIDUAL',
  FAMILY: 'FAMILY',
  COMPANY: 'COMPANY',
  GROUP: 'GROUP',
};

const HotelCronJobType = {
  ATTENDANCE_ABSENCE_SCAN: 'ATTENDANCE_ABSENCE_SCAN',
  CHECKOUT_DUE_SCAN: 'CHECKOUT_DUE_SCAN',
  OVERDUE_PAYMENT_SCAN: 'OVERDUE_PAYMENT_SCAN',
};

const Role = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
};

const TaskStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
};

Module._load = function patchedPrismaLoad(request, parent, isMain) {
  if (request === '@prisma/client' || request === '.prisma/client/default') {
    return {
      PrismaClient: FakePrismaClient,
      ReservationStatus,
      PaymentStatus,
      RoomStatus,
      BookingType,
      HotelCronJobType,
      Role,
      TaskPriority,
      TaskStatus,
    };
  }

  return originalLoad.call(this, request, parent, isMain);
};
