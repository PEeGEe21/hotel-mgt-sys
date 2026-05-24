import { Injectable, Logger } from '@nestjs/common';
import { LockProvider, IssueLockKeyParams, LockAccessLogRecord } from './lock-provider.interface';

export type MockProvisioningActivity = {
  type: 'ISSUE' | 'REVOKE';
  hotelId?: string;
  reservationId?: string;
  roomId?: string;
  lockDeviceId: string;
  accessTokenPreview: string;
  guestName?: string;
  validFrom?: Date;
  validUntil?: Date;
  occurredAt: Date;
};

@Injectable()
export class MockLockProvider implements LockProvider {
  private readonly logger = new Logger(MockLockProvider.name);
  private readonly provisioningActivity: MockProvisioningActivity[] = [];
  private readonly accessLogs: LockAccessLogRecord[] = [];

  getProvisioningActivity() {
    return [...this.provisioningActivity];
  }

  reset() {
    this.provisioningActivity.length = 0;
    this.accessLogs.length = 0;
  }

  async issueKey(params: IssueLockKeyParams) {
    const event: MockProvisioningActivity = {
      type: 'ISSUE',
      hotelId: params.hotelId,
      reservationId: params.reservationId,
      roomId: params.roomId,
      lockDeviceId: params.lockDeviceId,
      accessTokenPreview: `${params.accessToken.slice(0, 10)}...`,
      guestName: params.guestName,
      validFrom: params.validFrom,
      validUntil: params.validUntil,
      occurredAt: new Date(),
    };
    this.provisioningActivity.push(event);
    this.logger.log(
      `Mock provisioning issue hotel=${params.hotelId ?? 'unknown'} reservation=${params.reservationId ?? 'unknown'} room=${params.roomId ?? 'unknown'} device=${params.lockDeviceId} token=${event.accessTokenPreview} validFrom=${params.validFrom.toISOString()} validUntil=${params.validUntil.toISOString()} guest="${params.guestName ?? 'unassigned'}"`,
    );
  }

  async revokeKey(accessToken: string, lockDeviceId: string) {
    const event: MockProvisioningActivity = {
      type: 'REVOKE',
      lockDeviceId,
      accessTokenPreview: `${accessToken.slice(0, 10)}...`,
      occurredAt: new Date(),
    };
    this.provisioningActivity.push(event);
    this.logger.log(
      `Mock provisioning revoke device=${lockDeviceId} token=${event.accessTokenPreview}`,
    );
  }

  async pullAccessLogs(args?: {
    hotelId: string;
    from?: Date;
    to?: Date;
  }): Promise<LockAccessLogRecord[]> {
    return this.accessLogs.filter((record) => {
      if (args?.from && record.occurredAt.getTime() < args.from.getTime()) return false;
      if (args?.to && record.occurredAt.getTime() > args.to.getTime()) return false;
      return true;
    });
  }
}
