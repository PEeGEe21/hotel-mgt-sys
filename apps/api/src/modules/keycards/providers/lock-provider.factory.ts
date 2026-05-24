import { Injectable } from '@nestjs/common';
import { MockLockProvider } from './mock-lock.provider';
import { LockProvider } from './lock-provider.interface';

@Injectable()
export class LockProviderFactory {
  constructor(private readonly mockLockProvider: MockLockProvider) {}

  resolve(vendor?: string | null): LockProvider {
    const normalized = vendor?.trim().toUpperCase();
    if (!normalized || normalized === 'MOCK') {
      return this.mockLockProvider;
    }

    // Real vendors get added behind this seam later.
    return this.mockLockProvider;
  }
}
