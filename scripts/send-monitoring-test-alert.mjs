import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile(path.join(repoRoot, '.env'));
loadEnvFile(path.join(repoRoot, 'apps/api/.env'));

function readString(key) {
  const value = process.env[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function usage() {
  process.stdout.write(`Usage:
  pnpm monitoring:test

Optional environment overrides:
  MONITORING_TEST_EVENT
  MONITORING_TEST_MESSAGE
  MONITORING_TEST_LEVEL
  MONITORING_TEST_FINGERPRINT
`);
}

function normalizeText(value, fallback = '—') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function truncate(value, max = 2800) {
  const text = normalizeText(value, '');
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function severityColor(level) {
  switch (String(level || '').toLowerCase()) {
    case 'critical':
      return '#d92d20';
    case 'warning':
      return '#f79009';
    default:
      return '#2563eb';
  }
}

function buildSlackPayload(payload) {
  const detailLines = Object.entries(payload.details || {})
    .slice(0, 12)
    .map(([key, value]) => `*${key}*: ${truncate(typeof value === 'string' ? value : JSON.stringify(value), 400)}`);

  return {
    text: `[${String(payload.level).toUpperCase()}] ${payload.event}: ${payload.message}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `HotelOS ${String(payload.level).toUpperCase()} alert`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Event*\n${normalizeText(payload.event)}` },
          { type: 'mrkdwn', text: `*Environment*\n${normalizeText(payload.environment, 'unknown')}` },
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

const alertWebhookUrl = readString('MONITORING_ALERT_WEBHOOK_URL');

if (!alertWebhookUrl) {
  process.stderr.write('MONITORING_ALERT_WEBHOOK_URL is not set.\n');
  usage();
  process.exit(1);
}

const level = readString('MONITORING_TEST_LEVEL') || 'warning';
const event = readString('MONITORING_TEST_EVENT') || 'ops.monitoring_test';
const message =
  readString('MONITORING_TEST_MESSAGE') ||
  'HotelOS monitoring test alert. Safe to ignore if this was intentional.';
const environment =
  readString('DEPLOYMENT_ENVIRONMENT') || readString('NODE_ENV') || 'development';
const releaseVersion = readString('RELEASE_VERSION');
const releaseCommitSha = readString('RELEASE_COMMIT_SHA');
const fingerprint = readString('MONITORING_TEST_FINGERPRINT') || 'manual-monitoring-test';

const payload = {
  level,
  event,
  message,
  environment,
  releaseVersion,
  releaseCommitSha,
  timestamp: new Date().toISOString(),
  details: {
    source: 'scripts/send-monitoring-test-alert.mjs',
    fingerprint,
    manual: true,
  },
};

try {
  new URL(alertWebhookUrl);
} catch {
  process.stderr.write('MONITORING_ALERT_WEBHOOK_URL must be a valid URL.\n');
  process.exit(1);
}

const response = await fetch(alertWebhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'hotel-os-monitoring-test/1.0',
  },
  body: JSON.stringify(buildSlackPayload(payload)),
});

if (!response.ok) {
  const body = await response.text();
  process.stderr.write(
    `Monitoring test alert failed with HTTP ${response.status}: ${body || '<empty body>'}\n`,
  );
  process.exit(1);
}

process.stdout.write(
  `Monitoring test alert sent successfully to Slack via ${alertWebhookUrl}\n` +
    `Event: ${event}\n` +
    `Level: ${level}\n`,
);
