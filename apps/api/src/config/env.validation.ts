type EnvValue = string | undefined;

const PRODUCTION = 'production';

function readString(config: Record<string, unknown>, key: string): EnvValue {
  const value = config[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function assertUrl(value: EnvValue, key: string) {
  if (!value) return;

  try {
    new URL(value);
  } catch {
    throw new Error(`${key} must be a valid URL`);
  }
}

function assertInteger(value: EnvValue, key: string) {
  if (!value) return;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }
}

function assertProductionSecret(value: EnvValue, key: string, fallback: string) {
  if (!value) {
    throw new Error(`${key} is required in production`);
  }

  if (value === fallback || value.length < 32) {
    throw new Error(`${key} must be a secure production secret with at least 32 characters`);
  }
}

function assertCorsOrigins(value: EnvValue) {
  if (!value) return;

  value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .forEach((origin) => assertUrl(origin, 'CORS_ORIGINS'));
}

function assertEmailFrom(value: EnvValue, key: string) {
  if (!value) return;

  const trimmed = value.trim();
  const match = trimmed.match(/<([^<>]+)>$/);
  const email = (match ? match[1] : trimmed).trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`${key} must be a valid email address or formatted sender like "HotelOS <noreply@example.com>"`);
  }
}

function assertPushSubject(value: EnvValue, key: string) {
  if (!value) return;
  if (value.startsWith('mailto:')) {
    const email = value.slice('mailto:'.length).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`${key} mailto value must contain a valid email address`);
    }
    return;
  }

  assertUrl(value, key);
}

export function validateEnv(config: Record<string, unknown>) {
  const nodeEnv = readString(config, 'NODE_ENV') || 'development';
  const frontendUrl = readString(config, 'FRONTEND_URL');
  const corsOrigins = readString(config, 'CORS_ORIGINS');
  const emailFrom = readString(config, 'EMAIL_FROM');
  const resendApiKey = readString(config, 'RESEND_API_KEY');
  const redisUrl = readString(config, 'REDIS_URL');
  const webPushPublicKey = readString(config, 'WEB_PUSH_PUBLIC_KEY');
  const webPushPrivateKey = readString(config, 'WEB_PUSH_PRIVATE_KEY');
  const webPushSubject = readString(config, 'WEB_PUSH_SUBJECT');
  const monitoringAlertWebhookUrl = readString(config, 'MONITORING_ALERT_WEBHOOK_URL');

  assertInteger(readString(config, 'PORT'), 'PORT');
  assertInteger(readString(config, 'RATE_LIMIT_WINDOW_MS'), 'RATE_LIMIT_WINDOW_MS');
  assertInteger(readString(config, 'RATE_LIMIT_MAX'), 'RATE_LIMIT_MAX');
  assertInteger(readString(config, 'MONITORING_ALERT_DEDUP_MS'), 'MONITORING_ALERT_DEDUP_MS');
  assertUrl(frontendUrl, 'FRONTEND_URL');
  assertUrl(redisUrl, 'REDIS_URL');
  assertUrl(monitoringAlertWebhookUrl, 'MONITORING_ALERT_WEBHOOK_URL');
  assertCorsOrigins(corsOrigins);
  assertEmailFrom(emailFrom, 'EMAIL_FROM');
  assertPushSubject(webPushSubject, 'WEB_PUSH_SUBJECT');

  const hasAnyPushConfig = Boolean(webPushPublicKey || webPushPrivateKey || webPushSubject);
  if (hasAnyPushConfig && (!webPushPublicKey || !webPushPrivateKey || !webPushSubject)) {
    throw new Error(
      'WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY, and WEB_PUSH_SUBJECT must all be set together',
    );
  }

  if (nodeEnv === PRODUCTION) {
    if (!readString(config, 'DATABASE_URL')) {
      throw new Error('DATABASE_URL is required in production');
    }

    if (!redisUrl) {
      throw new Error('REDIS_URL is required in production');
    }

    if (!frontendUrl && !corsOrigins) {
      throw new Error('FRONTEND_URL or CORS_ORIGINS is required in production');
    }

    assertProductionSecret(readString(config, 'JWT_SECRET'), 'JWT_SECRET', 'change-me-in-production');
    assertProductionSecret(readString(config, 'JWT_REFRESH_SECRET'), 'JWT_REFRESH_SECRET', 'refresh-change-me');

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is required in production');
    }

    if (!emailFrom) {
      throw new Error('EMAIL_FROM is required in production');
    }
  }

  return config;
}
