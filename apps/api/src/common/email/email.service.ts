import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  hotelId?: string | null;
  event?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private async logDelivery(args: {
    hotelId?: string | null;
    recipient: string;
    subject: string;
    fromEmail: string;
    provider: string;
    event?: string;
    status: 'SENT' | 'FAILED' | 'SKIPPED';
    errorMessage?: string | null;
    providerMessageId?: string | null;
    metadata?: Record<string, unknown> | null;
    sentAt?: Date | null;
  }) {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO "EmailDeliveryLog"
          ("id", "hotelId", "recipient", "subject", "fromEmail", "provider", "event", "status", "errorMessage", "providerMessageId", "metadata", "sentAt")
        VALUES
          (
            ${randomUUID()},
            ${args.hotelId ?? null},
            ${args.recipient},
            ${args.subject},
            ${args.fromEmail},
            ${args.provider},
            ${args.event ?? null},
            ${args.status},
            ${args.errorMessage ?? null},
            ${args.providerMessageId ?? null},
            ${args.metadata ? JSON.stringify(args.metadata) : null}::jsonb,
            ${args.sentAt ?? null}
          )
      `;
    } catch (error) {
      this.logger.warn(`Email delivery log insert failed: ${String(error)}`);
    }
  }

  async sendEmail(options: SendEmailOptions) {
    const apiKey = this.config.get<string>('email.resendApiKey');
    const from = this.config.get<string>('email.from') || 'HotelOS <noreply@hotelos.com>';

    if (!apiKey) {
      this.logger.warn(`RESEND_API_KEY is not configured; skipped email to ${options.to}.`);
      await this.logDelivery({
        hotelId: options.hotelId ?? null,
        recipient: options.to,
        subject: options.subject,
        fromEmail: from,
        provider: 'resend',
        event: options.event,
        status: 'SKIPPED',
        errorMessage: 'RESEND_API_KEY is not configured',
        metadata: options.metadata ?? null,
      });
      return { sent: false, provider: 'resend' };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      const rawBody = await response.text();
      const parsedBody = rawBody ? JSON.parse(rawBody) : null;

      if (!response.ok) {
        this.logger.error(`Resend email failed with ${response.status}: ${rawBody}`);
        await this.logDelivery({
          hotelId: options.hotelId ?? null,
          recipient: options.to,
          subject: options.subject,
          fromEmail: from,
          provider: 'resend',
          event: options.event,
          status: 'FAILED',
          errorMessage: `HTTP ${response.status}: ${rawBody}`,
          providerMessageId: parsedBody?.id ?? null,
          metadata: options.metadata ?? null,
        });
        return { sent: false, provider: 'resend', statusCode: response.status };
      }

      await this.logDelivery({
        hotelId: options.hotelId ?? null,
        recipient: options.to,
        subject: options.subject,
        fromEmail: from,
        provider: 'resend',
        event: options.event,
        status: 'SENT',
        providerMessageId: parsedBody?.id ?? null,
        metadata: options.metadata ?? null,
        sentAt: new Date(),
      });

      return { sent: true, provider: 'resend', providerMessageId: parsedBody?.id ?? null };
    } catch (error) {
      this.logger.error(`Resend email request failed: ${String(error)}`);
      await this.logDelivery({
        hotelId: options.hotelId ?? null,
        recipient: options.to,
        subject: options.subject,
        fromEmail: from,
        provider: 'resend',
        event: options.event,
        status: 'FAILED',
        errorMessage: String(error),
        metadata: options.metadata ?? null,
      });
      return { sent: false, provider: 'resend' };
    }
  }
}
