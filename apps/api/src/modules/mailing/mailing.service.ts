import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';

@Injectable()
export class MailingService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async list(params: {
    hotelId: string | null;
    page?: number;
    limit?: number;
    status?: string;
    event?: string;
    search?: string;
    correlationId?: string;
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

    if (params.correlationId) {
      where.AND = [
        ...(where.AND ?? []),
        {
          metadata: {
            path: ['correlationId'],
            equals: params.correlationId,
          },
        },
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

  async retry(hotelId: string | null, id: string) {
    const row = await this.prisma.emailDeliveryLog.findFirst({
      where: { id, hotelId },
    });

    if (!row) {
      throw new NotFoundException('Email delivery log not found.');
    }

    if (!['FAILED', 'SKIPPED'].includes(row.status)) {
      throw new BadRequestException('Only failed or skipped deliveries can be retried.');
    }

    const metadata =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, any>)
        : {};
    const retryPayload =
      metadata.retryPayload &&
      typeof metadata.retryPayload === 'object' &&
      !Array.isArray(metadata.retryPayload)
        ? metadata.retryPayload
        : null;

    if (!retryPayload?.html || !retryPayload?.subject || !retryPayload?.to) {
      throw new BadRequestException('This delivery log does not have a stored retry payload.');
    }

    const result = await this.emailService.sendEmail({
      to: String(retryPayload.to),
      subject: String(retryPayload.subject),
      html: String(retryPayload.html),
      text: retryPayload.text ? String(retryPayload.text) : undefined,
      hotelId: (retryPayload.hotelId as string | null | undefined) ?? hotelId,
      event: (retryPayload.event as string | undefined) ?? row.event ?? undefined,
      metadata: {
        ...metadata,
        retriedFromLogId: row.id,
        retryTriggeredAt: new Date().toISOString(),
        retryTrigger: 'manual_mail_log_retry',
      },
    });

    return {
      retried: true,
      sent: result.sent,
      sourceLogId: row.id,
    };
  }
}
