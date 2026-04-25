import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MailingService {
  constructor(private prisma: PrismaService) {}

  async list(params: {
    hotelId: string | null;
    page?: number;
    limit?: number;
    status?: string;
    event?: string;
    search?: string;
  }) {
    if (!params.hotelId) {
      return {
        emails: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        meta: {
          total: 0,
          current_page: 1,
          per_page: 20,
          last_page: 1,
          from: 0,
          to: 0,
        },
      };
    }

    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(params.limit ?? 20, 5), 100);
    const skip = (page - 1) * limit;
    const where: any = { hotelId: params.hotelId };

    if (params.status) {
      where.status = params.status.toUpperCase();
    }

    if (params.event) {
      where.event = { contains: params.event, mode: 'insensitive' };
    }

    if (params.search) {
      where.OR = [
        { recipient: { contains: params.search, mode: 'insensitive' } },
        { subject: { contains: params.search, mode: 'insensitive' } },
        { fromEmail: { contains: params.search, mode: 'insensitive' } },
        { event: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.emailDeliveryLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.emailDeliveryLog.count({ where }),
    ]);

    return {
      emails: rows,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      meta: {
        total,
        current_page: page,
        per_page: limit,
        last_page: Math.max(1, Math.ceil(total / limit)),
        from: total === 0 ? 0 : skip + 1,
        to: Math.min(skip + limit, total),
      },
    };
  }
}
