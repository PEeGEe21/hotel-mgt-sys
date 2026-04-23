import { randomUUID } from 'node:crypto';
import { StructuredLogger } from '../logger/structured-logger';

type LoggedRequest = {
  method?: string;
  originalUrl?: string;
  url?: string;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  socket: {
    remoteAddress?: string;
  };
  requestId?: string;
};

type LoggedResponse = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  on(event: 'finish', listener: () => void): void;
};

function getHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getClientIp(req: LoggedRequest) {
  const forwardedFor = getHeaderValue(req.headers['x-forwarded-for']);

  return forwardedFor?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress || 'unknown';
}

function logRequest(logger: StructuredLogger, level: 'log' | 'warn' | 'error', payload: Record<string, unknown>) {
  if (level === 'error') {
    logger.error(payload, undefined, 'HTTP');
    return;
  }

  logger[level](payload, 'HTTP');
}

export function createRequestLoggingMiddleware(logger: StructuredLogger) {
  return (req: LoggedRequest, res: LoggedResponse, next: () => void) => {
    const startedAt = process.hrtime.bigint();
    const requestId = getHeaderValue(req.headers['x-request-id']) || randomUUID();

    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'log';

      logRequest(logger, level, {
        requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        ip: getClientIp(req),
        userAgent: getHeaderValue(req.headers['user-agent']),
      });
    });

    next();
  };
}
