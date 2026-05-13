const RENDER_API_BASE_URL = process.env.RENDER_API_BASE_URL || 'https://api.render.com/v1';

function readRequired(key) {
  const value = process.env[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value.trim();
}

function readOptional(key) {
  const value = process.env[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function renderRequest(path, { method = 'GET', body } = {}) {
  const apiKey = readRequired('RENDER_API_KEY');
  const response = await fetch(`${RENDER_API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Render API ${method} ${path} failed with HTTP ${response.status}: ${text || '<empty body>'}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function updateEnvVar(serviceId, key, value) {
  await renderRequest(`/services/${serviceId}/env-vars/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: { value },
  });
}

async function updateServiceImageRepository(serviceId, imageRepository) {
  await renderRequest(`/services/${serviceId}`, {
    method: 'PATCH',
    body: {
      autoDeploy: 'no',
      image: {
        name: imageRepository,
      },
    },
  });
}

async function triggerImageDeploy(serviceId, imageUrl) {
  return renderRequest(`/services/${serviceId}/deploys`, {
    method: 'POST',
    body: {
      imageUrl,
    },
  });
}

async function waitForDeploy(serviceId, deployId) {
  const timeoutMs = Number(readOptional('RENDER_DEPLOY_TIMEOUT_MS') || 20 * 60 * 1000);
  const intervalMs = Number(readOptional('RENDER_DEPLOY_POLL_INTERVAL_MS') || 10 * 1000);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const deploy = await renderRequest(`/services/${serviceId}/deploys/${deployId}`);
    const status = String(deploy.status || '').toLowerCase();

    if (['live', 'build_failed', 'update_failed', 'canceled', 'deactivated'].includes(status)) {
      return deploy;
    }

    await sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for deploy ${deployId} on service ${serviceId}`);
}

function imageRepositoryFromUrl(imageUrl) {
  const atIndex = imageUrl.indexOf('@');
  if (atIndex >= 0) {
    return imageUrl.slice(0, atIndex);
  }

  const lastColon = imageUrl.lastIndexOf(':');
  const lastSlash = imageUrl.lastIndexOf('/');
  return lastColon > lastSlash ? imageUrl.slice(0, lastColon) : imageUrl;
}

async function rolloutService({
  label,
  serviceId,
  imageUrl,
  sharedEnv,
  extraEnv = {},
  waitForLive = true,
}) {
  const imageRepository = imageRepositoryFromUrl(imageUrl);
  const envEntries = Object.entries({ ...sharedEnv, ...extraEnv }).filter(([, value]) => value !== null);

  process.stdout.write(`\n==> ${label}: pinning image repository\n`);
  await updateServiceImageRepository(serviceId, imageRepository);

  process.stdout.write(`==> ${label}: updating ${envEntries.length} runtime env var(s)\n`);
  for (const [key, value] of envEntries) {
    await updateEnvVar(serviceId, key, value);
  }

  process.stdout.write(`==> ${label}: triggering deploy for ${imageUrl}\n`);
  const deploy = await triggerImageDeploy(serviceId, imageUrl);
  const deployId = deploy?.id;

  if (!deployId) {
    throw new Error(`Render deploy response for ${label} did not include an id`);
  }

  process.stdout.write(`==> ${label}: deploy queued as ${deployId}\n`);

  if (!waitForLive) {
    return { deployId, status: 'queued' };
  }

  const finalDeploy = await waitForDeploy(serviceId, deployId);
  const status = String(finalDeploy.status || 'unknown').toLowerCase();
  process.stdout.write(`==> ${label}: final status ${status}\n`);

  if (status !== 'live') {
    throw new Error(`${label} deploy ${deployId} finished with status ${status}`);
  }

  return { deployId, status };
}

async function main() {
  const releaseVersion = readRequired('RELEASE_VERSION');
  const releaseCommitSha = readRequired('RELEASE_COMMIT_SHA');
  const deploymentEnvironment = readRequired('DEPLOYMENT_ENVIRONMENT');
  const apiServiceId = readRequired('RENDER_API_SERVICE_ID');
  const apiImageUrl = readRequired('RENDER_API_IMAGE_URL');
  const monitoringAlertWebhookUrl = readOptional('MONITORING_ALERT_WEBHOOK_URL');
  const monitoringAlertDedupMs = readOptional('MONITORING_ALERT_DEDUP_MS');
  const waitForLive = readOptional('RENDER_WAIT_FOR_LIVE') !== 'false';

  const sharedEnv = {
    RELEASE_VERSION: releaseVersion,
    RELEASE_COMMIT_SHA: releaseCommitSha,
    DEPLOYMENT_ENVIRONMENT: deploymentEnvironment,
  };

  const apiResult = await rolloutService({
    label: 'API',
    serviceId: apiServiceId,
    imageUrl: apiImageUrl,
    sharedEnv,
    extraEnv: {
      MONITORING_ALERT_WEBHOOK_URL: monitoringAlertWebhookUrl,
      MONITORING_ALERT_DEDUP_MS: monitoringAlertDedupMs,
    },
    waitForLive,
  });

  process.stdout.write(
    `\nRender rollout complete.\nAPI deploy: ${apiResult.deployId} (${apiResult.status})\n`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
