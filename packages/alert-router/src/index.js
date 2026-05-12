function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  });
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

function readSeverityColor(level) {
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
  const level = normalizeText(payload.level, 'info').toUpperCase();
  const event = normalizeText(payload.event);
  const message = normalizeText(payload.message);
  const environment = normalizeText(payload.environment, 'unknown');
  const releaseVersion = normalizeText(payload.releaseVersion, 'unknown');
  const releaseCommitSha = normalizeText(payload.releaseCommitSha, 'unknown');
  const timestamp = normalizeText(payload.timestamp, new Date().toISOString());
  const details = payload.details && typeof payload.details === 'object' ? payload.details : {};

  const detailLines = Object.entries(details)
    .slice(0, 12)
    .map(([key, value]) => `*${key}*: ${truncate(typeof value === 'string' ? value : JSON.stringify(value), 400)}`);

  return {
    text: `[${level}] ${event}: ${message}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `HotelOS ${level} alert`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Event*\n${event}` },
          { type: 'mrkdwn', text: `*Environment*\n${environment}` },
          { type: 'mrkdwn', text: `*Release*\n${releaseVersion}` },
          { type: 'mrkdwn', text: `*Commit*\n${releaseCommitSha}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Message*\n${truncate(message, 2500)}`,
        },
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `Timestamp: ${timestamp}` }],
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
    attachments: [
      {
        color: readSeverityColor(payload.level),
      },
    ],
  };
}

function isAuthorized(url, env) {
  const expectedToken = env.ALERT_ROUTER_TOKEN;
  if (!expectedToken) return true;

  const pathname = url.pathname.replace(/^\/+|\/+$/g, '');
  return pathname === expectedToken;
}

async function forwardToSlack(payload, env) {
  if (!env.SLACK_WEBHOOK_URL) {
    return json(
      {
        ok: false,
        error: 'SLACK_WEBHOOK_URL is not configured',
      },
      { status: 500 },
    );
  }

  const response = await fetch(env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(buildSlackPayload(payload)),
  });

  if (!response.ok) {
    const body = await response.text();
    return json(
      {
        ok: false,
        error: 'Slack webhook delivery failed',
        status: response.status,
        body: body || null,
      },
      { status: 502 },
    );
  }

  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET') {
      return json({
        ok: true,
        service: 'hotel-os-alert-router',
      });
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: 'Method not allowed' }, { status: 405 });
    }

    if (!isAuthorized(url, env)) {
      return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!payload || typeof payload !== 'object') {
      return json({ ok: false, error: 'Payload must be an object' }, { status: 400 });
    }

    if (!payload.event || !payload.message) {
      return json(
        {
          ok: false,
          error: 'Payload must include at least event and message',
        },
        { status: 400 },
      );
    }

    return forwardToSlack(payload, env);
  },
};
