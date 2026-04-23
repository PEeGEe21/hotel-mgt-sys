type RateLimitOptions = {
  max: number;
  windowMs: number;
  skipPaths?: string[];
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

type RateLimitBucket = {
  count: number;
  resetAt: number;
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
  const buckets = new Map<string, RateLimitBucket>();
  const cleanup = setInterval(() => {
    const now = Date.now();

    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }, Math.max(options.windowMs, 60_000));

  cleanup.unref?.();

  return (req: RateLimitRequest, res: RateLimitResponse, next: () => void) => {
    if (shouldSkip(req, options.skipPaths || [])) {
      next();
      return;
    }

    const now = Date.now();
    const key = getClientKey(req);
    const existingBucket = buckets.get(key);
    const bucket =
      existingBucket && existingBucket.resetAt > now
        ? existingBucket
        : { count: 0, resetAt: now + options.windowMs };

    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(options.max - bucket.count, 0);
    const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', String(options.max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > options.max) {
      res.setHeader('Retry-After', String(resetSeconds));
      res.status(429).json({
        statusCode: 429,
        message: 'Too many requests. Please try again later.',
        retryAfter: resetSeconds,
      });
      return;
    }

    next();
  };
}
