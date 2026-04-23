import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';

const DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '');
}

function parseOrigins(value?: string) {
  if (!value) return [];

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
}

export function buildCorsOptions(configService: ConfigService): CorsOptions {
  const nodeEnv = configService.get<string>('nodeEnv') || 'development';
  const frontendUrl = configService.get<string>('frontendUrl');
  const configuredOrigins = parseOrigins(process.env.CORS_ORIGINS);
  const fallbackOrigins = frontendUrl ? [normalizeOrigin(frontendUrl)] : [];
  const devOrigins = nodeEnv === 'production' ? [] : DEV_ORIGINS;
  const allowedOrigins = new Set([...configuredOrigins, ...fallbackOrigins, ...devOrigins]);

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
  };
}
