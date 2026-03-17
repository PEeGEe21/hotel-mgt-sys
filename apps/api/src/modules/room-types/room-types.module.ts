import { Module } from '@nestjs/common';
import { RoomTypesController } from './room-types.controller';
import { RoomTypesService } from './room-types.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [RoomTypesController],
  providers: [RoomTypesService, PrismaService],
})
export class RoomTypesModule {}
