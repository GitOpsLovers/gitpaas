# syntax=docker/dockerfile:1
#
# Production image for the GitPaaS backend (NestJS control plane).
#
# Multi-stage, pnpm-in-a-Turborepo build. The build context is the repo ROOT
# (so the workspace lockfile + manifests are available); build with:
#
#   docker build -f iac/production/backend.Dockerfile -t gitpaas-backend .
#
# Stages:
#   base    — Node + corepack-pinned pnpm, matching .tool-versions.
#   build   — installs the backend's deps (with dev deps), compiles it, then
#             `pnpm deploy`s a self-contained, prod-only bundle with a REAL
#             (de-symlinked) node_modules that is safe to copy across stages.
#   runtime — slim, non-root image carrying only dist/ + production node_modules.

ARG NODE_VERSION=26.1.0
ARG PNPM_VERSION=11.1.3

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
# build: install (with dev deps), compile, and stage a prod-only bundle
# ---------------------------------------------------------------------------
FROM base AS build

# Toolchain for optional native addons pulled in transitively (argon2, ssh2,
# cpu-features). Prebuilt binaries are used when available; these are the
# fallback so the install never fails on a fresh base.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy the workspace manifests first so dependency installs stay cache-friendly.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/contracts/package.json packages/contracts/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @gitpaas/backend...

# Compile `@gitpaas/contracts`
COPY packages/contracts packages/contracts
RUN pnpm --filter @gitpaas/contracts build

# Compile the backend to apps/backend/dist.
COPY apps/backend apps/backend
RUN pnpm --filter @gitpaas/backend build

# Produce a portable bundle: prod-only deps with a real node_modules directory
# (pnpm deploy de-symlinks the store), ready to copy into the runtime stage.
# --legacy: there are no injected workspace deps, so use the classic deploy path
# (pnpm v10+ otherwise requires inject-workspace-packages).
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter @gitpaas/backend --prod --legacy deploy /prod/backend

# Stamp the version of the ROOT manifest so the runtime stage publishes it as
# `service.version` without carrying the workspace manifest along.
RUN node -p "require('/repo/package.json').version" > /prod/version

# ---------------------------------------------------------------------------
# runtime: minimal, non-root
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Ship only what the app needs at runtime.
COPY --from=build /prod/backend/node_modules ./node_modules
COPY --from=build /prod/backend/package.json ./package.json
COPY --from=build /repo/apps/backend/dist ./dist
COPY --from=build /prod/version ./version

# Drop privileges — the `node` user ships with the official image.
USER node

# Must match the PORT env var the app listens on (default 3000).
EXPOSE 3000

# Hits the public health endpoint (GET /api/v1 -> { status: 'ok' }). Uses the
# Node global fetch so no extra packages are needed in the runtime layer.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# nest build (tsconfig rootDir ".") emits the tree under dist/src. APP_VERSION is
# exported from the version stamped at build time so telemetry publishes it as
# `service.version` (ENV cannot take a value computed by another stage).
CMD ["sh", "-c", "export APP_VERSION=\"$(cat /app/version)\"; exec node dist/src/main.js"]
