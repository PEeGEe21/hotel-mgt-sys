import { RedisService } from '../redis/redis.service';

type RateLimitOptions = {
  max: number;
  windowMs: number;
  skipPaths?: string[];
  redisService: RedisService;
  onError?: (error: unknown) => void;
};

type RateLimitRequest = {
  method?: string;
  path?: string;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket: {
    remoteAddress?: string;
  };
};

type RateLimitResponse = {
  setHeader(name: string, value: string): void;
  status(statusCode: number): {
    json(body: unknown): void;
  };
};

function getClientKey(req: RateLimitRequest) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0];

  return forwardedIp?.trim() || req.ip || req.socket.remoteAddress || 'unknown';
}

function shouldSkip(req: RateLimitRequest, skipPaths: string[]) {
  if (req.method === 'OPTIONS') return true;

  return skipPaths.some((path) => req.path === path || req.path?.startsWith(`${path}/`));
}

export function createRateLimitMiddleware(options: RateLimitOptions) {
  const script = `
    local current = redis.call("INCR", KEYS[1])
    if current == 1 then
      redis.call("PEXPIRE", KEYS[1], ARGV[1])
    end
    local ttl = redis.call("PTTL", KEYS[1])
    return {current, ttl}
  `;

  return (req: RateLimitRequest, res: RateLimitResponse, next: () => void) => {
    void (async () => {
      if (shouldSkip(req, options.skipPaths || [])) {
        next();
        return;
      }

      try {
        await options.redisService.ensureReady();

        const now = Date.now();
        const key = `rate-limit:${getClientKey(req)}`;
        const result = (await options.redisService.command.eval(
          script,
          1,
          key,
          String(options.windowMs),
        )) as [number | string, number | string];

        const count = Number(result[0] ?? 0);
        const ttlMs = Math.max(Number(result[1] ?? options.windowMs), 0);
        const resetAt = now + ttlMs;
        const remaining = Math.max(options.max - count, 0);
        const resetSeconds = Math.max(1, Math.ceil(ttlMs / 1000));

        res.setHeader('X-RateLimit-Limit', String(options.max));
        res.setHeader('X-RateLimit-Remaining', String(remaining));
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));

        if (count > options.max) {
          res.setHeader('Retry-After', String(resetSeconds));
          res.status(429).json({
            statusCode: 429,
            message: 'Too many requests. Please try again later.',
            retryAfter: resetSeconds,
          });
          return;
        }

        next();
      } catch (error) {
        options.onError?.(error);
        next();
      }
    })();
  };
}
