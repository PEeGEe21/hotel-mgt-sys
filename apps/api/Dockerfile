FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ARG RELEASE_VERSION=dev
ARG RELEASE_COMMIT_SHA=unknown
ARG DEPLOYMENT_ENVIRONMENT=production
ENV RELEASE_VERSION=$RELEASE_VERSION
ENV RELEASE_COMMIT_SHA=$RELEASE_COMMIT_SHA
ENV DEPLOYMENT_ENVIRONMENT=$DEPLOYMENT_ENVIRONMENT
RUN pnpm --filter @hotel-os/api exec prisma generate
RUN pnpm --filter @hotel-os/api build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
ARG RELEASE_VERSION=dev
ARG RELEASE_COMMIT_SHA=unknown
ARG DEPLOYMENT_ENVIRONMENT=production
ENV RELEASE_VERSION=$RELEASE_VERSION
ENV RELEASE_COMMIT_SHA=$RELEASE_COMMIT_SHA
ENV DEPLOYMENT_ENVIRONMENT=$DEPLOYMENT_ENVIRONMENT
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --filter @hotel-os/api... --prod --frozen-lockfile
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
EXPOSE 4000
CMD ["pnpm", "--filter", "@hotel-os/api", "start"]
