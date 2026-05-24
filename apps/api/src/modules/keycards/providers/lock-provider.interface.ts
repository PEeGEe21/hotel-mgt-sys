export type IssueLockKeyParams = {
  hotelId?: string;
  reservationId?: string;
  roomId?: string;
  accessToken: string;
  lockDeviceId: string;
  validFrom: Date;
  validUntil: Date;
  guestName?: string;
};

export type LockAccessLogRecord = {
  accessToken: string;
  deviceId?: string;
  occurredAt: Date;
  granted: boolean;
  reason?: string;
  vendorEventId?: string;
};

export interface LockProvider {
  issueKey(params: IssueLockKeyParams): Promise<void>;
  revokeKey(accessToken: string, lockDeviceId: string): Promise<void>;
  pullAccessLogs?(args: {
    hotelId: string;
    from?: Date;
    to?: Date;
  }): Promise<LockAccessLogRecord[]>;
}
