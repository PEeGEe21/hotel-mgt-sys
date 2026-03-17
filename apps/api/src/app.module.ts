import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { PermissionsGuard } from './modules/auth/guards';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
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
  ],
  providers: [PermissionsGuard],
})
export class AppModule {}
