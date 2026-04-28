import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';
import { RealtimeAuthService } from './realtime-auth.service';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimePresenceService } from './realtime-presence.service';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
  ],
  providers: [RealtimeAuthService, RealtimeGateway, RealtimePresenceService],
  exports: [RealtimeGateway, RealtimePresenceService],
})
export class RealtimeModule {}
