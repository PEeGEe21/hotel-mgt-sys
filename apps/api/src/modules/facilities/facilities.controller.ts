import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FacilitiesService } from './facilities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
@ApiTags('Facilities') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('facilities')
export class FacilitiesController { constructor(private facilitiesService: FacilitiesService) {} }
