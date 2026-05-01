type EmailBranding = {
  hotelName: string;
  hotelEmail?: string | null;
  hotelPhone?: string | null;
  hotelWebsite?: string | null;
  hotelAddress?: string | null;
  hotelLogo?: string | null;
};

type RenderBrandedEmailArgs = {
  branding: EmailBranding;
  subject: string;
  html: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isAbsoluteUrl(value: string | null | undefined) {
  if (!value) return false;
  return /^https?:\/\//i.test(value) || value.startsWith('data:image/');
}

export function renderBrandedEmail(args: RenderBrandedEmailArgs) {
  const hotelName = escapeHtml(args.branding.hotelName);
  const hotelEmail = args.branding.hotelEmail ? escapeHtml(args.branding.hotelEmail) : null;
  const hotelPhone = args.branding.hotelPhone ? escapeHtml(args.branding.hotelPhone) : null;
  const hotelWebsite = args.branding.hotelWebsite ? escapeHtml(args.branding.hotelWebsite) : null;
  const hotelAddress = args.branding.hotelAddress ? escapeHtml(args.branding.hotelAddress) : null;
  const subject = escapeHtml(args.subject);
  const logo = isAbsoluteUrl(args.branding.hotelLogo) ? args.branding.hotelLogo : null;

  const contactItems = [hotelEmail, hotelPhone, hotelWebsite].filter(Boolean).join(' • ');

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background: #eef2f7; color: #0f172a;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          ${subject} from ${hotelName}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; background: #eef2f7; width: 100%;">
          <tr>
            <td align="center" style="padding: 32px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%; max-width: 640px;">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                      <tr>
                        <td style="font-family: Arial, sans-serif; vertical-align: middle;">
                          ${
                            logo
                              ? `<img src="${logo}" alt="${hotelName} logo" style="display: block; max-height: 52px; max-width: 180px; margin-bottom: 12px;" />`
                              : `<div style="display: inline-block; margin-bottom: 12px; padding: 8px 12px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">${hotelName}</div>`
                          }
                          <div style="font-size: 28px; line-height: 1.2; font-weight: 700; color: #0f172a;">${subject}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background: #ffffff; border: 1px solid #dbe3ef; border-radius: 20px; padding: 28px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);">
                    <div style="font-family: Arial, sans-serif; color: #111827; font-size: 15px; line-height: 1.65;">
                      ${args.html}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 18px 8px 0; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.6; color: #64748b;">
                    <div style="font-weight: 700; color: #334155; margin-bottom: 6px;">${hotelName}</div>
                    ${hotelAddress ? `<div style="margin-bottom: 4px;">${hotelAddress}</div>` : ''}
                    ${contactItems ? `<div style="margin-bottom: 4px;">${contactItems}</div>` : ''}
                    <div>This message was sent by HotelOS notifications.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `.trim();
}
