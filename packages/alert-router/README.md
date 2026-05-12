# Alert Router

This package is a tiny webhook transformer for HotelOS monitoring alerts.

Purpose:

- accept the generic monitoring payload produced by HotelOS
- forward it to Slack using Slack-compatible formatting
- keep Slack as an implementation detail outside the main app

## Why This Exists

The API currently emits a generic monitoring payload with fields such as:

- `level`
- `event`
- `message`
- `environment`
- `releaseVersion`
- `releaseCommitSha`
- `timestamp`
- `details`

Slack incoming webhooks expect Slack-shaped JSON, not the raw HotelOS payload. This router translates between the two.

## Recommended Deployment

Deploy this as a tiny edge/service worker or any simple HTTP endpoint that can:

- receive `POST` JSON
- read environment variables
- `fetch` the Slack incoming webhook

The implementation in [src/index.js](/var/www/html/hotel-os/packages/alert-router/src/index.js:1) is written in a Worker-style shape:

```js
export default {
  async fetch(request, env) { ... }
}
```

That makes it easy to host on platforms like:

- Cloudflare Workers
- any adapter that can wrap a Fetch-style handler

Recommended starting host:

- Cloudflare Workers

Deployment guide:

- [platform-cloudflare-workers-alert-router.md](/var/www/html/hotel-os/docs/operations/platform-cloudflare-workers-alert-router.md)

## Environment Variables

- `SLACK_WEBHOOK_URL`
- `ALERT_ROUTER_TOKEN` optional shared secret

If `ALERT_ROUTER_TOKEN` is set, the request path must match it.

Example:

```text
https://your-router.example.com/super-secret-token
```

Then set:

```env
MONITORING_ALERT_WEBHOOK_URL=https://your-router.example.com/super-secret-token
```

in the HotelOS API runtime.

## Health Check

`GET /` returns a small JSON response to confirm the router is alive.

## Example Payload From HotelOS

```json
{
  "level": "critical",
  "event": "api.readiness_degraded",
  "message": "HotelOS API readiness check is degraded",
  "environment": "production",
  "releaseVersion": "release-42",
  "releaseCommitSha": "abc1234",
  "timestamp": "2026-05-12T10:00:00.000Z",
  "details": {
    "status": "degraded"
  }
}
```

## Verification

After deployment:

1. set `MONITORING_ALERT_WEBHOOK_URL` to the router URL
2. run `pnpm monitoring:test`
3. confirm the Slack message arrives
4. confirm the alert includes release and environment metadata

## Future Extension

If you later move away from Slack, keep HotelOS sending the same generic payload and only change this router.
