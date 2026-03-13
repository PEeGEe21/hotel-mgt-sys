import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class FacilitiesService { constructor(private prisma: PrismaService) {} }
