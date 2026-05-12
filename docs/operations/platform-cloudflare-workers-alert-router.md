# Cloudflare Workers Alert Router

This is optional advanced setup.

It is not required for the current direct-Slack monitoring path.

This guide deploys the HotelOS alert router to Cloudflare Workers.

Use this only when you want:

- HotelOS to keep sending generic monitoring payloads
- Slack to be the first real destination
- a lightweight, cheap, portable router layer

## Files

- router code: [packages/alert-router/src/index.js](/var/www/html/hotel-os/packages/alert-router/src/index.js:1)
- router README: [packages/alert-router/README.md](/var/www/html/hotel-os/packages/alert-router/README.md:1)
- Worker config example: [packages/alert-router/wrangler.toml.example](/var/www/html/hotel-os/packages/alert-router/wrangler.toml.example:1)

## 1. Create Slack Incoming Webhook

Create an incoming webhook for the Slack channel that should receive HotelOS alerts.

Save the resulting URL. You will use it as:

- `SLACK_WEBHOOK_URL`

## 2. Deploy The Worker

Inside `packages/alert-router`, create a real `wrangler.toml` from the example:

```bash
cp wrangler.toml.example wrangler.toml
```

Set a strong random token in `ALERT_ROUTER_TOKEN`.

Then set the Slack webhook as a secret:

```bash
wrangler secret put SLACK_WEBHOOK_URL
```

Deploy:

```bash
wrangler deploy
```

After deploy, your Worker URL will look something like:

```text
https://hotel-os-alert-router.<subdomain>.workers.dev
```

If `ALERT_ROUTER_TOKEN=abc123`, the protected webhook endpoint becomes:

```text
https://hotel-os-alert-router.<subdomain>.workers.dev/abc123
```

## 3. Configure HotelOS API

Set this in the HotelOS API runtime instead of the direct Slack webhook:

```env
MONITORING_ALERT_WEBHOOK_URL=https://hotel-os-alert-router.<subdomain>.workers.dev/<ALERT_ROUTER_TOKEN>
```

Do not set `SLACK_WEBHOOK_URL` in the HotelOS API.

That secret belongs only to the router.

## 4. Verify

From the HotelOS repo:

```bash
MONITORING_ALERT_WEBHOOK_URL=https://hotel-os-alert-router.<subdomain>.workers.dev/<ALERT_ROUTER_TOKEN> \
DEPLOYMENT_ENVIRONMENT=production \
RELEASE_VERSION=manual-test \
RELEASE_COMMIT_SHA=test123 \
pnpm monitoring:test
```

Confirm:

- the Worker returns success
- the Slack message arrives
- the message includes environment and release metadata

## 5. Health Check

You can verify the router is reachable with:

```bash
curl https://hotel-os-alert-router.<subdomain>.workers.dev
```

Expected response:

```json
{"ok":true,"service":"hotel-os-alert-router"}
```

## Operational Notes

- keep the token path secret
- rotate the token if it leaks
- rotate the Slack webhook if it leaks
- if you later move from Slack to another destination, update only the router

## Relationship To HotelOS

Final flow:

```text
HotelOS API
  -> MONITORING_ALERT_WEBHOOK_URL
  -> Cloudflare Worker alert router
  -> SLACK_WEBHOOK_URL
  -> Slack
```
