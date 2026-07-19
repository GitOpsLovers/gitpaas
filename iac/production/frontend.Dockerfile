# syntax=docker/dockerfile:1
#
# Production image for the GitPaaS frontend (Angular SPA).
#
# Multi-stage, pnpm-in-a-Turborepo build. The build context is the repo ROOT
# (so the workspace lockfile + manifests are available); build with:
#
#   docker build -f iac/production/frontend.Dockerfile -t gitpaas-frontend .
#
# Stages:
#   base    — Node + corepack-pinned pnpm, matching .tool-versions.
#   build   — installs the frontend's deps and produces the static bundle.
#   runtime — nginx-unprivileged (non-root) serving the pre-built static files.

ARG NODE_VERSION=26.1.0
ARG PNPM_VERSION=11.1.3
ARG NGINX_VERSION=1.29-alpine

# ---------------------------------------------------------------------------
# base: pinned Node + pnpm
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ARG PNPM_VERSION
# Node 26 no longer bundles corepack, so install the pinned pnpm via npm.
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /repo

# ---------------------------------------------------------------------------
# build: install deps and produce the static Angular bundle
# ---------------------------------------------------------------------------
FROM base AS build

# Workspace manifests first for a cache-friendly dependency install.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/frontend/package.json apps/frontend/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @gitopslovers/gitpaas/frontend...

# Build the production bundle (Angular's `application` builder emits to
# apps/frontend/dist/frontend/browser).
COPY apps/frontend apps/frontend
RUN pnpm --filter @gitopslovers/gitpaas/frontend build

# ---------------------------------------------------------------------------
# runtime: non-root nginx serving the static files
# ---------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:${NGINX_VERSION} AS runtime

COPY iac/production/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/frontend/dist/frontend/browser /usr/share/nginx/html

# nginx-unprivileged already runs as the non-root `nginx` (uid 101) user and
# listens on 8080.
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
