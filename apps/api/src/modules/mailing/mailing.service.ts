import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type EmailDeliveryLogRow = {
  id: string;
  hotelId: string | null;
  recipient: string;
  subject: string;
  fromEmail: string;
  provider: string;
  event: string | null;
  status: string;
  errorMessage: string | null;
  providerMessageId: string | null;
  metadata: Record<string, unknown> | null;
  sentAt: Date | null;
  createdAt: Date;
};

type CountRow = { count: bigint };

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
    const offset = (page - 1) * limit;

    const conditions = [`"hotelId" = $1`];
    const values: unknown[] = [params.hotelId];

    if (params.status) {
      values.push(params.status.toUpperCase());
      conditions.push(`"status" = $${values.length}`);
    }

    if (params.event) {
      values.push(`%${params.event}%`);
      conditions.push(`COALESCE("event", '') ILIKE $${values.length}`);
    }

    if (params.search) {
      values.push(`%${params.search}%`);
      const idx = values.length;
      conditions.push(
        `("recipient" ILIKE $${idx} OR "subject" ILIKE $${idx} OR COALESCE("event", '') ILIKE $${idx} OR "fromEmail" ILIKE $${idx})`,
      );
    }

    const whereClause = conditions.join(' AND ');

    const rows = await this.prisma.$queryRawUnsafe<EmailDeliveryLogRow[]>(
      `
        SELECT "id", "hotelId", "recipient", "subject", "fromEmail", "provider", "event", "status",
               "errorMessage", "providerMessageId", "metadata", "sentAt", "createdAt"
        FROM "EmailDeliveryLog"
        WHERE ${whereClause}
        ORDER BY "createdAt" DESC
        OFFSET $${values.length + 1}
        LIMIT $${values.length + 2}
      `,
      ...values,
      offset,
      limit,
    );

    const totalRows = await this.prisma.$queryRawUnsafe<CountRow[]>(
      `
        SELECT COUNT(*)::bigint AS count
        FROM "EmailDeliveryLog"
        WHERE ${whereClause}
      `,
      ...values,
    );

    const total = Number(totalRows[0]?.count ?? 0);

    return {
      emails: rows.map((row) => ({
        id: row.id,
        hotelId: row.hotelId,
        recipient: row.recipient,
        subject: row.subject,
        fromEmail: row.fromEmail,
        provider: row.provider,
        event: row.event,
        status: row.status,
        errorMessage: row.errorMessage,
        providerMessageId: row.providerMessageId,
        metadata: row.metadata,
        sentAt: row.sentAt,
        createdAt: row.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      meta: {
        total,
        current_page: page,
        per_page: limit,
        last_page: Math.max(1, Math.ceil(total / limit)),
        from: total === 0 ? 0 : offset + 1,
        to: Math.min(offset + limit, total),
      },
    };
  }
}
