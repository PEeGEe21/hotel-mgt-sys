import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { renderBrandedEmail } from './email-template';

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  hotelId?: string | null;
  event?: string;
  metadata?: Record<string, unknown>;
};

type EmailAttemptResult = {
  ok: boolean;
  statusCode?: number;
  rawBody?: string;
  parsedBody?: any;
  error?: unknown;
  attempt: number;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private parseJsonSafely(value: string) {
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private isRetryableStatus(statusCode: number) {
    return statusCode === 408 || statusCode === 409 || statusCode === 425 || statusCode === 429 || statusCode >= 500;
  }

  private async sendViaResend(args: {
    apiKey: string;
    from: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<EmailAttemptResult> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${args.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'hotel-os/1.0',
        },
        body: JSON.stringify({
          from: args.from,
          to: [args.to],
          subject: args.subject,
          html: args.html,
          text: args.text,
        }),
      });

      const rawBody = await response.text();
      const parsedBody = this.parseJsonSafely(rawBody);
      return {
        ok: response.ok,
        statusCode: response.status,
        rawBody,
        parsedBody,
        attempt: 1,
      };
    } catch (error) {
      return {
        ok: false,
        error,
        attempt: 1,
      };
    }
  }

  private buildRetryMetadata(options: SendEmailOptions, extra?: Record<string, unknown>) {
    return {
      ...(options.metadata ?? {}),
      retryPayload: {
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text ?? null,
        hotelId: options.hotelId ?? null,
        event: options.event ?? null,
      },
      ...extra,
    };
  }

  private async getBranding(hotelId?: string | null) {
    if (!hotelId) {
      return {
        hotelName: 'HotelOS',
        hotelEmail: null,
        hotelPhone: null,
        hotelWebsite: null,
        hotelAddress: null,
        hotelLogo: null,
        emailAutoRetryEnabled: false,
      };
    }

    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        name: true,
        email: true,
        phone: true,
        website: true,
        logo: true,
        address: true,
        city: true,
        state: true,
        country: true,
        emailAutoRetryEnabled: true,
      },
    });

    if (!hotel) {
      return {
        hotelName: 'HotelOS',
        hotelEmail: null,
        hotelPhone: null,
        hotelWebsite: null,
        hotelAddress: null,
        hotelLogo: null,
        emailAutoRetryEnabled: false,
      };
    }

    const addressParts = [hotel.address, hotel.city, hotel.state, hotel.country].filter(Boolean);

    return {
      hotelName: hotel.name,
      hotelEmail: hotel.email,
      hotelPhone: hotel.phone,
      hotelWebsite: hotel.website,
      hotelAddress: addressParts.join(', '),
      hotelLogo: hotel.logo,
      emailAutoRetryEnabled: hotel.emailAutoRetryEnabled,
    };
  }

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
      await this.prisma.emailDeliveryLog.create({
        data: {
          hotelId: args.hotelId ?? null,
          recipient: args.recipient,
          subject: args.subject,
          fromEmail: args.fromEmail,
          provider: args.provider,
          event: args.event ?? null,
          status: args.status,
          errorMessage: args.errorMessage ?? null,
          providerMessageId: args.providerMessageId ?? null,
          metadata: args.metadata
            ? (args.metadata as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          sentAt: args.sentAt ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(`Email delivery log insert failed: ${String(error)}`);
    }
  }

  async sendEmail(options: SendEmailOptions) {
    const apiKey = this.config.get<string>('email.resendApiKey');
    const from = this.config.get<string>('email.from') || 'HotelOS <noreply@hotelos.com>';
    const branding = await this.getBranding(options.hotelId ?? null);
    const brandedHtml = renderBrandedEmail({
      branding,
      subject: options.subject,
      html: options.html,
    });

    const autoRetryEnabled = Boolean(branding.emailAutoRetryEnabled);

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
        metadata: this.buildRetryMetadata(options, {
          retryState: {
            attempts: 0,
            retryable: false,
            mode: 'configuration_missing',
            autoRetryEnabled,
          },
        }),
      });
      return { sent: false, provider: 'resend' };
    }

    const maxAttempts = autoRetryEnabled ? 3 : 1;
    let lastAttempt: EmailAttemptResult | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const result = await this.sendViaResend({
        apiKey,
        from,
        to: options.to,
        subject: options.subject,
        html: brandedHtml,
        text: options.text,
      });
      lastAttempt = { ...result, attempt };

      if (result.ok) {
        await this.logDelivery({
          hotelId: options.hotelId ?? null,
          recipient: options.to,
          subject: options.subject,
          fromEmail: from,
          provider: 'resend',
          event: options.event,
          status: 'SENT',
          providerMessageId: result.parsedBody?.id ?? null,
          metadata: this.buildRetryMetadata(options, {
            retryState: {
              attempts: attempt,
              retryable: false,
              recoveredAfterRetry: attempt > 1,
              autoRetryEnabled,
            },
          }),
          sentAt: new Date(),
        });
        return {
          sent: true,
          provider: 'resend',
          providerMessageId: result.parsedBody?.id ?? null,
        };
      }

      const retryable =
        result.error !== undefined ||
        (typeof result.statusCode === 'number' && this.isRetryableStatus(result.statusCode));

      if (!retryable || attempt >= maxAttempts) {
        break;
      }
    }

    if (lastAttempt?.statusCode) {
      this.logger.error(
        `Resend email failed with ${lastAttempt.statusCode}: ${lastAttempt.rawBody ?? ''}`,
      );
      await this.logDelivery({
        hotelId: options.hotelId ?? null,
        recipient: options.to,
        subject: options.subject,
        fromEmail: from,
        provider: 'resend',
        event: options.event,
        status: 'FAILED',
        errorMessage: `HTTP ${lastAttempt.statusCode}: ${lastAttempt.rawBody ?? ''}`,
        providerMessageId: lastAttempt.parsedBody?.id ?? null,
        metadata: this.buildRetryMetadata(options, {
          retryState: {
            attempts: lastAttempt.attempt,
            retryable: this.isRetryableStatus(lastAttempt.statusCode),
            exhausted: true,
            autoRetryEnabled,
          },
        }),
      });
      return { sent: false, provider: 'resend', statusCode: lastAttempt.statusCode };
    }

    this.logger.error(`Resend email request failed: ${String(lastAttempt?.error ?? 'unknown error')}`);
    await this.logDelivery({
      hotelId: options.hotelId ?? null,
      recipient: options.to,
      subject: options.subject,
      fromEmail: from,
      provider: 'resend',
      event: options.event,
      status: 'FAILED',
      errorMessage: String(lastAttempt?.error ?? 'unknown error'),
      metadata: this.buildRetryMetadata(options, {
        retryState: {
          attempts: lastAttempt?.attempt ?? 1,
          retryable: true,
          exhausted: true,
          autoRetryEnabled,
        },
      }),
    });
    return { sent: false, provider: 'resend' };
  }
}
