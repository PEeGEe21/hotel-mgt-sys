import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { runSeedData } from './seed-data';

@Injectable()
export class SeedService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async run(key?: string) {
    const configuredKey = this.configService.get<string>('seed.routeKey');

    if (!configuredKey) {
      throw new ServiceUnavailableException('Seed route is disabled');
    }

    if (!key || key !== configuredKey) {
      throw new ForbiddenException('Invalid seed key');
    }

    await runSeedData(this.prisma);

    return {
      ok: true,
      message: 'Seed completed successfully',
    };
  }
}
