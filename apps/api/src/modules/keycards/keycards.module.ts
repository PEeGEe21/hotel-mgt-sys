import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { KeycardsController } from './controllers/keycards.controller';
import { KeycardsService } from './services/keycards.service';
import { LockProviderFactory } from './providers/lock-provider.factory';
import { MockLockProvider } from './providers/mock-lock.provider';

@Module({
  imports: [PrismaModule],
  providers: [KeycardsService, LockProviderFactory, MockLockProvider],
  controllers: [KeycardsController],
  exports: [KeycardsService],
})
export class KeycardsModule {}
