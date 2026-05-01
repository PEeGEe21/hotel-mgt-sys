type MonitoringLevel = 'info' | 'warning' | 'critical';

type MonitoringPayload = {
  level: MonitoringLevel;
  event: string;
  message: string;
  environment: string;
  releaseVersion: string | null;
  releaseCommitSha: string | null;
  timestamp: string;
  details?: Record<string, unknown>;
};

function readString(key: string) {
  const value = process.env[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function getMonitoringConfig() {
  const dedupRaw = readString('MONITORING_ALERT_DEDUP_MS');
  const dedupMs = dedupRaw ? Number(dedupRaw) : 5 * 60 * 1000;

  return {
    alertWebhookUrl: readString('MONITORING_ALERT_WEBHOOK_URL'),
    environment:
      readString('DEPLOYMENT_ENVIRONMENT') || readString('NODE_ENV') || 'development',
    releaseVersion: readString('RELEASE_VERSION'),
    releaseCommitSha: readString('RELEASE_COMMIT_SHA'),
    dedupMs: Number.isFinite(dedupMs) && dedupMs > 0 ? dedupMs : 5 * 60 * 1000,
  };
}

class MonitoringNotifier {
  private readonly lastSentAt = new Map<string, number>();

  private shouldSend(event: string, fingerprint?: string | null) {
    const config = getMonitoringConfig();
    if (!config.alertWebhookUrl) return false;

    const key = `${event}:${fingerprint ?? 'default'}`;
    const now = Date.now();
    const previous = this.lastSentAt.get(key) ?? 0;

    if (now - previous < config.dedupMs) return false;

    this.lastSentAt.set(key, now);
    return true;
  }

  private async post(payload: MonitoringPayload) {
    const config = getMonitoringConfig();
    if (!config.alertWebhookUrl) return;

    try {
      await fetch(config.alertWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'hotel-os-monitoring/1.0',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(
        `${JSON.stringify({
          level: 'error',
          message: 'Monitoring webhook delivery failed',
          context: 'MonitoringNotifier',
          timestamp: new Date().toISOString(),
          metadata: { error: message, originalEvent: payload.event },
        })}\n`,
      );
    }
  }

  async notify(args: {
    level: MonitoringLevel;
    event: string;
    message: string;
    details?: Record<string, unknown>;
    fingerprint?: string | null;
  }) {
    if (!this.shouldSend(args.event, args.fingerprint)) return;

    const config = getMonitoringConfig();
    await this.post({
      level: args.level,
      event: args.event,
      message: args.message,
      environment: config.environment,
      releaseVersion: config.releaseVersion,
      releaseCommitSha: config.releaseCommitSha,
      timestamp: new Date().toISOString(),
      details: args.details,
    });
  }

  async notifyStartupFailure(error: unknown) {
    await this.notify({
      level: 'critical',
      event: 'api.startup_failed',
      message: 'HotelOS API failed to start',
      details: this.normalizeError(error),
      fingerprint: 'startup_failed',
    });
  }

  async notifyReadinessDegraded(readiness: Record<string, unknown>) {
    await this.notify({
      level: 'critical',
      event: 'api.readiness_degraded',
      message: 'HotelOS API readiness check is degraded',
      details: readiness,
      fingerprint: JSON.stringify(readiness.checks ?? readiness.status ?? 'degraded'),
    });
  }

  async notifyUnhandledError(
    event: 'process.uncaught_exception' | 'process.unhandled_rejection' | 'api.unhandled_exception',
    error: unknown,
    details?: Record<string, unknown>,
  ) {
    const normalized = this.normalizeError(error);
    await this.notify({
      level: 'critical',
      event,
      message: normalized.message || 'Unhandled runtime error',
      details: {
        ...normalized,
        ...details,
      },
      fingerprint: normalized.fingerprint,
    });
  }

  private normalizeError(error: unknown) {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        fingerprint: `${error.name}:${error.message}`,
      };
    }

    const message = String(error ?? 'Unknown error');
    return {
      name: 'UnknownError',
      message,
      stack: undefined,
      fingerprint: message,
    };
  }
}

export const monitoringNotifier = new MonitoringNotifier();

export function getReleaseMetadata() {
  const config = getMonitoringConfig();
  return {
    environment: config.environment,
    releaseVersion: config.releaseVersion,
    releaseCommitSha: config.releaseCommitSha,
  };
}
