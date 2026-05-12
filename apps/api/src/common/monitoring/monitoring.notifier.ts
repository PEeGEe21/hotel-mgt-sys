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

type SlackWebhookPayload = {
  text: string;
  blocks: Array<Record<string, unknown>>;
  attachments: Array<Record<string, unknown>>;
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

function normalizeText(value: unknown, fallback = '—') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function truncate(value: unknown, max = 2800) {
  const text = normalizeText(value, '');
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function severityColor(level: MonitoringLevel) {
  switch (level) {
    case 'critical':
      return '#d92d20';
    case 'warning':
      return '#f79009';
    default:
      return '#2563eb';
  }
}

function buildSlackPayload(payload: MonitoringPayload): SlackWebhookPayload {
  const detailLines = Object.entries(payload.details ?? {})
    .filter(([, value]) => value !== undefined)
    .slice(0, 12)
    .map(
      ([key, value]) =>
        `*${key}*: ${truncate(typeof value === 'string' ? value : JSON.stringify(value), 400)}`,
    );

  return {
    text: `[${payload.level.toUpperCase()}] ${payload.event}: ${payload.message}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `HotelOS ${payload.level.toUpperCase()} alert`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Event*\n${normalizeText(payload.event)}` },
          { type: 'mrkdwn', text: `*Environment*\n${normalizeText(payload.environment)}` },
          { type: 'mrkdwn', text: `*Release*\n${normalizeText(payload.releaseVersion, 'unknown')}` },
          { type: 'mrkdwn', text: `*Commit*\n${normalizeText(payload.releaseCommitSha, 'unknown')}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Message*\n${truncate(payload.message, 2500)}`,
        },
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `Timestamp: ${normalizeText(payload.timestamp)}` }],
      },
      ...(detailLines.length
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Details*\n${detailLines.join('\n')}`,
              },
            },
          ]
        : []),
    ],
    attachments: [{ color: severityColor(payload.level) }],
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
      const response = await fetch(config.alertWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'hotel-os-monitoring/1.0',
        },
        body: JSON.stringify(buildSlackPayload(payload)),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Slack webhook rejected alert with HTTP ${response.status}: ${body || '<empty body>'}`);
      }
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
