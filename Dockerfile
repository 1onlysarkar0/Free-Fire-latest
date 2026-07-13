# ── STAGE 1: Dependency Installation & Layer Caching ───────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json .npmrc ./

# Leverage Docker BuildKit cache mounts for rapid npm installs
RUN --mount=type=cache,target=/root/.npm npm ci

# ── STAGE 2: Multi-Stage Production Builder ─────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Pass dynamic build arguments during `docker build --build-arg KEY=VAL`
ARG NEXT_PUBLIC_APP_URL
ARG BETTER_AUTH_URL
ARG TRUSTED_ORIGINS
ARG DATABASE_URL
ARG BETTER_AUTH_SECRET

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV BETTER_AUTH_URL=$BETTER_AUTH_URL
ENV TRUSTED_ORIGINS=$TRUSTED_ORIGINS
ENV DATABASE_URL=$DATABASE_URL
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET

# Set compilation signals and optimization flags
ENV DOCKER_BUILD=1
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=12288"

# Compile Next.js production build with persistent BuildKit cache for .next/cache
RUN --mount=type=cache,target=/app/.next/cache npm run build

# ── STAGE 3: Production Execution Engine (Runner) ──────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Dynamic build args passed to runtime
ARG NEXT_PUBLIC_APP_URL
ARG BETTER_AUTH_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV BETTER_AUTH_URL=$BETTER_AUTH_URL

# Security: Unprivileged system group and user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone Next.js server engine with proper user permissions
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Automated Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/cache-version || exit 1

# Execute standalone production server directly
CMD ["node", "server.js"]
