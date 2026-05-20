# syntax=docker/dockerfile:1.7
# Multi-stage build for @trip-flow/api (ElysiaJS on Bun).
# Build context MUST be the monorepo root so workspace packages are visible.
#
#   docker build -f apps/api/Dockerfile -t trip-flow-api .

ARG BUN_VERSION=1.3.14

# ---------- base: shared layer ----------
FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /repo
ENV CI=true \
    NODE_ENV=production

# ---------- deps: install with cache mount ----------
FROM base AS deps
# Copy only manifests first so Bun's resolver layer is cacheable.
COPY package.json bun.lock ./
COPY apps/api/package.json        apps/api/package.json
COPY apps/web/package.json        apps/web/package.json
COPY packages/db/package.json     packages/db/package.json
COPY packages/ui/package.json     packages/ui/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# ---------- development: hot-reload target for docker compose ----------
FROM deps AS development
ENV NODE_ENV=development
WORKDIR /repo/apps/api
EXPOSE 4000
CMD ["bun", "--watch", "run", "src/index.ts"]

# ---------- builder: produce a self-contained bundle ----------
FROM deps AS builder
COPY tsconfig.json ./
COPY packages packages
COPY apps/api apps/api
WORKDIR /repo/apps/api
RUN bun build src/index.ts \
      --target=bun \
      --outdir=dist \
      --minify \
      --sourcemap

# ---------- runtime: minimal image, non-root user ----------
FROM oven/bun:${BUN_VERSION}-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000
# Bun's image already ships a non-root `bun` user.
USER bun
COPY --from=builder --chown=bun:bun /repo/apps/api/dist ./dist
COPY --from=builder --chown=bun:bun /repo/apps/api/package.json ./package.json
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/health/ || exit 1
CMD ["bun", "run", "dist/index.js"]
