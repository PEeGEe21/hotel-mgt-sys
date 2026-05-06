import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeAuthService } from './realtime-auth.service';
import { RealtimeController } from './realtime.controller';
import { RealtimeDiagnosticsService } from './realtime-diagnostics.service';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimePresenceService } from './realtime-presence.service';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    ConfigModule,
    forwardRef(() => NotificationsModule),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
  ],
  providers: [
    RealtimeAuthService,
    RealtimeGateway,
    RealtimePresenceService,
    RealtimeDiagnosticsService,
  ],
  controllers: [RealtimeController],
  exports: [RealtimeGateway, RealtimePresenceService, RealtimeDiagnosticsService],
})
export class RealtimeModule {}
