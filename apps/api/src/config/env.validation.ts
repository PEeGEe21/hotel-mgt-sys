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

export function validateEnv(config: Record<string, unknown>) {
  const nodeEnv = readString(config, 'NODE_ENV') || 'development';
  const frontendUrl = readString(config, 'FRONTEND_URL');
  const corsOrigins = readString(config, 'CORS_ORIGINS');

  assertInteger(readString(config, 'PORT'), 'PORT');
  assertInteger(readString(config, 'RATE_LIMIT_WINDOW_MS'), 'RATE_LIMIT_WINDOW_MS');
  assertInteger(readString(config, 'RATE_LIMIT_MAX'), 'RATE_LIMIT_MAX');
  assertUrl(frontendUrl, 'FRONTEND_URL');
  assertCorsOrigins(corsOrigins);

  if (nodeEnv === PRODUCTION) {
    if (!readString(config, 'DATABASE_URL')) {
      throw new Error('DATABASE_URL is required in production');
    }

    if (!frontendUrl && !corsOrigins) {
      throw new Error('FRONTEND_URL or CORS_ORIGINS is required in production');
    }

    assertProductionSecret(readString(config, 'JWT_SECRET'), 'JWT_SECRET', 'change-me-in-production');
    assertProductionSecret(readString(config, 'JWT_REFRESH_SECRET'), 'JWT_REFRESH_SECRET', 'refresh-change-me');
  }

  return config;
}
