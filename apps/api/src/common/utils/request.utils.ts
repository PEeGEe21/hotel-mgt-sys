export function getRequestIp(req: any): string | null {
  const header = req?.headers?.['x-forwarded-for'];
  if (typeof header === 'string' && header.length > 0) {
    return header.split(',')[0].trim();
  }
  if (Array.isArray(header) && header.length > 0) {
    return String(header[0]);
  }
  return req?.ip ?? null;
}

export function getUserAgent(req: any): string | null {
  const ua = req?.headers?.['user-agent'];
  return typeof ua === 'string' ? ua : null;
}
