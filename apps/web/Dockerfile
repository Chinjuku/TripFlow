# syntax=docker/dockerfile:1.7
# Multi-stage build for @trip-flow/web (Vite + React PWA).
# Build context MUST be the monorepo root.
#
#   docker build -f apps/web/Dockerfile \
#     --build-arg VITE_SUPABASE_URL=... \
#     --build-arg VITE_SUPABASE_ANON_KEY=... \
#     --build-arg VITE_API_URL=... \
#     -t trip-flow-web .

ARG BUN_VERSION=1.3.14
ARG NGINX_VERSION=1.27-alpine

# ---------- base ----------
FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /repo
ENV CI=true

# ---------- deps ----------
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/api/package.json        apps/api/package.json
COPY apps/web/package.json        apps/web/package.json
COPY packages/db/package.json     packages/db/package.json
COPY packages/ui/package.json     packages/ui/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# ---------- development: Vite dev server for compose ----------
FROM deps AS development
ENV NODE_ENV=development
WORKDIR /repo/apps/web
EXPOSE 5173
# --host 0.0.0.0 so the container is reachable from the host.
CMD ["bun", "run", "vite", "--host", "0.0.0.0", "--port", "5173"]

# ---------- builder: Vite production build ----------
FROM deps AS builder
# VITE_* values are baked into the static bundle at build time.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_API_URL=$VITE_API_URL \
    NODE_ENV=production
COPY tsconfig.json ./
COPY packages packages
COPY apps/web apps/web
WORKDIR /repo/apps/web
RUN bun run build

# ---------- runtime: nginx serving the static bundle ----------
FROM nginx:${NGINX_VERSION} AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
