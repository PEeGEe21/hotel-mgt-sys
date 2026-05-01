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

  private async getBranding(hotelId?: string | null) {
    if (!hotelId) {
      return {
        hotelName: 'HotelOS',
        hotelEmail: null,
        hotelPhone: null,
        hotelWebsite: null,
        hotelAddress: null,
        hotelLogo: null,
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
          'User-Agent': 'hotel-os/1.0',
        },
        body: JSON.stringify({
          from,
          to: [options.to],
          subject: options.subject,
          html: brandedHtml,
          text: options.text,
        }),
      });

      const rawBody = await response.text();
      const parsedBody = this.parseJsonSafely(rawBody);

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
