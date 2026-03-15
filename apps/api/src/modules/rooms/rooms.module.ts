import { Module } from '@nestjs/common';
import { RoomsService } from './services/rooms.service';
import { RoomsController } from './controllers/rooms.controller';
@Module({ providers: [RoomsService], controllers: [RoomsController], exports: [RoomsService] })
export class RoomsModule {}
