export const NOTIFICATION_EVENTS = [
  'newReservation',
  'checkIn',
  'checkOut',
  'checkOutDue',
  'paymentReceived',
  'lowInventory',
  'maintenanceAlert',
  'attendanceAlert',
  'systemAlerts',
] as const;

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export const NOTIFICATION_EVENT_PERMISSIONS: Record<NotificationEvent, string> = {
  newReservation: 'view:reservations',
  checkIn: 'checkin:reservations',
  checkOut: 'checkout:reservations',
  checkOutDue: 'checkout:reservations',
  paymentReceived: 'view:finance',
  lowInventory: 'view:inventory',
  maintenanceAlert: 'view:facilities',
  attendanceAlert: 'view:attendance',
  systemAlerts: 'view:settings',
};

export const DEFAULT_NOTIFICATION_PREFERENCES: Record<
  NotificationEvent,
  { channelEmail: boolean; channelInApp: boolean; channelPush: boolean }
> = {
  newReservation: { channelEmail: true, channelInApp: true, channelPush: false },
  checkIn: { channelEmail: false, channelInApp: true, channelPush: true },
  checkOut: { channelEmail: false, channelInApp: true, channelPush: false },
  checkOutDue: { channelEmail: true, channelInApp: true, channelPush: true },
  paymentReceived: { channelEmail: true, channelInApp: true, channelPush: false },
  lowInventory: { channelEmail: true, channelInApp: true, channelPush: false },
  maintenanceAlert: { channelEmail: false, channelInApp: true, channelPush: true },
  attendanceAlert: { channelEmail: false, channelInApp: false, channelPush: false },
  systemAlerts: { channelEmail: true, channelInApp: true, channelPush: true },
};
