# Alert Routing

Current default recommendation:

```text
HotelOS API -> MONITORING_ALERT_WEBHOOK_URL -> Slack
```

## Recommended Configuration

Set the Slack incoming webhook URL directly as:

```env
MONITORING_ALERT_WEBHOOK_URL=https://hooks.slack.com/services/AAA/BBB/CCC
```

HotelOS now formats Slack-compatible alert payloads directly.

## Verification Flow

1. create the Slack incoming webhook
2. set `MONITORING_ALERT_WEBHOOK_URL` in the API runtime
3. run `pnpm monitoring:test`
4. confirm the message lands in Slack

## Optional Future Router

If you later want multiple destinations or payload transformation, you can place a router in front of Slack.

That is optional, not required for the current setup.

Future optional path:

```text
HotelOS API -> MONITORING_ALERT_WEBHOOK_URL -> Alert Router -> Slack
```

Router scaffold:

- [packages/alert-router](/var/www/html/hotel-os/packages/alert-router/README.md)
