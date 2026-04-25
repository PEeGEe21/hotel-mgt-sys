import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import appConfig from './config/app.config';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { GuestsModule } from './modules/guests/guests.module';
import { StaffModule } from './modules/staff/staff.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { PosModule } from './modules/pos/pos.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { HousekeepingModule } from './modules/housekeeping/housekeeping.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ReportsModule } from './modules/reports/reports.module';
import { FacilitiesModule } from './modules/facilities/facilities.module';
import { PrismaModule } from './prisma/prisma.module';
import { FloorsModule } from './modules/floors/floors.module';
import { HotelsModule } from './modules/hotels/hotels.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { InventoryCategoriesModule } from './modules/inventory-categories/inventory-categories.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { RoomTypesModule } from './modules/room-types/room-types.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PermissionsGuard, RolesGuard } from './modules/auth/guards';
import { LedgerModule } from './modules/ledger/ledger.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { HealthModule } from './modules/health/health.module';
import { MailingModule } from './modules/mailing/mailing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnv,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('redis.url') || 'redis://localhost:6379';
        const parsed = new URL(redisUrl);
        return {
          redis: {
            host: parsed.hostname,
            port: Number(parsed.port || 6379),
            username: parsed.username || undefined,
            password: parsed.password || undefined,
            db: parsed.pathname && parsed.pathname !== '/' ? Number(parsed.pathname.slice(1)) : undefined,
            tls: parsed.protocol === 'rediss:' ? {} : undefined,
          },
        };
      },
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RoomsModule,
    ReservationsModule,
    GuestsModule,
    StaffModule,
    AttendanceModule,
    PosModule,
    InventoryModule,
    HousekeepingModule,
    FinanceModule,
    ReportsModule,
    FacilitiesModule,
    FloorsModule,
    HotelsModule,
    DepartmentsModule,
    InventoryCategoriesModule,
    SuppliersModule,
    ShiftsModule,
    RoomTypesModule,
    PermissionsModule,
    LedgerModule,
    NotificationsModule,
    AuditLogsModule,
    MailingModule,
  ],
  providers: [PermissionsGuard, RolesGuard],
})
export class AppModule {}
