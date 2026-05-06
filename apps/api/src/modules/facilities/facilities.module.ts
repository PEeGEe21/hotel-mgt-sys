import { Module } from '@nestjs/common';
import { FacilitiesService } from './services/facilities.service';
import { FacilitiesController } from './controllers/facilities.controller';
import { FacilitiesBookingController } from './controllers/facilities-booking.controller';
import { FacilitiesComplaintController } from './controllers/facilities-complaint.controller';
import { FacilitiesInspectionController } from './controllers/facilities-inspection.controller';
import { FacilitiesMaintenanceController } from './controllers/facilities-maintenance.controller';
import { FacilitiesLocationController } from './controllers/facilities-location.controller';
import { FacilitiesRequisitionController } from './controllers/facilities-requisition.controller';
import { FacilitiesTypeController } from './controllers/facilities-type.controller';
import { FacilitiesDepartmentController } from './controllers/facilities-department.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
@Module({
  imports: [NotificationsModule, RealtimeModule],
  providers: [FacilitiesService],
  controllers: [
    FacilitiesController,
    FacilitiesBookingController,
    FacilitiesComplaintController,
    FacilitiesDepartmentController,
    FacilitiesInspectionController,
    FacilitiesLocationController,
    FacilitiesMaintenanceController,
    FacilitiesRequisitionController,
    FacilitiesTypeController,
  ],
  exports: [FacilitiesService],
})
export class FacilitiesModule {}
