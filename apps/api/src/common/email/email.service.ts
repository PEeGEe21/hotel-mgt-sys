import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendEmail(options: SendEmailOptions) {
    const apiKey = this.config.get<string>('email.resendApiKey');
    const from = this.config.get<string>('email.from') || 'HotelOS <noreply@hotelos.com>';

    if (!apiKey) {
      this.logger.warn(`RESEND_API_KEY is not configured; skipped email to ${options.to}.`);
      return { sent: false, provider: 'resend' };
    }

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

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Resend email failed with ${response.status}: ${body}`);
      return { sent: false, provider: 'resend', statusCode: response.status };
    }

    return { sent: true, provider: 'resend' };
  }
}
