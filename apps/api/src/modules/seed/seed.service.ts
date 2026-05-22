import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { runSeedData } from './seed-data';
import { seedSuperAdmin } from './super-admin-seed';

@Injectable()
export class SeedService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async run(key?: string, seedType?: string) {
    const configuredKey = this.configService.get<string>('seed.routeKey');

    if (!configuredKey) {
      throw new ServiceUnavailableException('Seed route is disabled');
    }

    if (!key || key !== configuredKey) {
      throw new ForbiddenException('Invalid seed key');
    }

    if (seedType === 'super-admin') {
      return seedSuperAdmin(this.prisma, {
        email: this.configService.get<string>('superAdmin.email'),
        password: this.configService.get<string>('superAdmin.password'),
        name: this.configService.get<string>('superAdmin.name'),
      });
    }

    await runSeedData(this.prisma);

    return {
      ok: true,
      message: 'Seed completed successfully',
    };
  }
}
