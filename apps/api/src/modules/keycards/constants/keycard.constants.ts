export const KEYCARD_TYPES = ['PHYSICAL', 'MOBILE'] as const;
export const KEYCARD_ACCESS_RESULTS = [
  'GRANTED',
  'DENIED',
  'EXPIRED',
  'REVOKED',
  'UNKNOWN',
] as const;
export const KEYCARD_ACCESS_METHODS = [
  'RFID',
  'NFC',
  'BLE',
  'MANUAL',
  'VENDOR_SYNC',
] as const;
export const KEYCARD_ACTIVE_RESERVATION_STATUSES = ['CONFIRMED', 'CHECKED_IN'] as const;
export const KEYCARD_TERMINAL_STATUSES = ['FAILED', 'REVOKED', 'LOST', 'EXPIRED'] as const;

export type KeycardTypeValue = (typeof KEYCARD_TYPES)[number];
export type KeycardAccessResultValue = (typeof KEYCARD_ACCESS_RESULTS)[number];
export type KeycardAccessMethodValue = (typeof KEYCARD_ACCESS_METHODS)[number];
