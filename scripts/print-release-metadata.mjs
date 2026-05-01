import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readPackageVersion() {
  const pkgPath = join(process.cwd(), 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  return pkg.version || '0.0.0';
}

function readCommitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const version = process.env.RELEASE_VERSION || readPackageVersion();
const commit = process.env.RELEASE_COMMIT_SHA || readCommitSha();
const environment = process.env.DEPLOYMENT_ENVIRONMENT || process.env.NODE_ENV || 'development';

process.stdout.write(
  JSON.stringify(
    {
      releaseVersion: version,
      releaseCommitSha: commit,
      deploymentEnvironment: environment,
    },
    null,
    2,
  ) + '\n',
);
