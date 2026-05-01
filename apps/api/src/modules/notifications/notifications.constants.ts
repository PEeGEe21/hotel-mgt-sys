export const NOTIFICATION_EVENTS = [
  'newReservation',
  'checkIn',
  'checkOut',
  'upcomingArrival',
  'checkOutDue',
  'paymentOverdue',
  'paymentReceived',
  'lowInventory',
  'housekeepingAlert',
  'noShowFollowUp',
  'maintenanceAlert',
  'maintenanceEscalation',
  'attendanceAlert',
  'dailyDigest',
  'systemAlerts',
] as const;

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export const NOTIFICATION_EVENT_PERMISSIONS: Record<NotificationEvent, string> = {
  newReservation: 'view:reservations',
  checkIn: 'checkin:reservations',
  checkOut: 'checkout:reservations',
  upcomingArrival: 'view:reservations',
  checkOutDue: 'checkout:reservations',
  paymentOverdue: 'view:finance',
  paymentReceived: 'view:finance',
  lowInventory: 'view:inventory',
  housekeepingAlert: 'view:housekeeping',
  noShowFollowUp: 'view:reservations',
  maintenanceAlert: 'view:facilities',
  maintenanceEscalation: 'view:facilities',
  attendanceAlert: 'view:attendance',
  dailyDigest: 'view:settings',
  systemAlerts: 'view:settings',
};

export const DEFAULT_NOTIFICATION_PREFERENCES: Record<
  NotificationEvent,
  { channelEmail: boolean; channelInApp: boolean; channelPush: boolean }
> = {
  newReservation: { channelEmail: true, channelInApp: true, channelPush: false },
  checkIn: { channelEmail: false, channelInApp: true, channelPush: true },
  checkOut: { channelEmail: false, channelInApp: true, channelPush: false },
  upcomingArrival: { channelEmail: true, channelInApp: true, channelPush: true },
  checkOutDue: { channelEmail: true, channelInApp: true, channelPush: true },
  paymentOverdue: { channelEmail: true, channelInApp: true, channelPush: true },
  paymentReceived: { channelEmail: true, channelInApp: true, channelPush: false },
  lowInventory: { channelEmail: true, channelInApp: true, channelPush: false },
  housekeepingAlert: { channelEmail: true, channelInApp: true, channelPush: true },
  noShowFollowUp: { channelEmail: true, channelInApp: true, channelPush: true },
  maintenanceAlert: { channelEmail: false, channelInApp: true, channelPush: true },
  maintenanceEscalation: { channelEmail: true, channelInApp: true, channelPush: true },
  attendanceAlert: { channelEmail: false, channelInApp: false, channelPush: false },
  dailyDigest: { channelEmail: true, channelInApp: true, channelPush: false },
  systemAlerts: { channelEmail: true, channelInApp: true, channelPush: true },
};
