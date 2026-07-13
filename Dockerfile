# ── STAGE 1: Install Dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json .npmrc ./

# Leverage Docker cache mounts for npm dependencies
RUN --mount=type=cache,target=/root/.npm npm ci

# ── STAGE 2: Build Application ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build performance & framework signals
ENV DOCKER_BUILD=1
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=12288"

# Build Next.js app with BuildKit cache mounting for .next/cache
RUN --mount=type=cache,target=/app/.next/cache npm run build

# ── STAGE 3: Production Runner Image ───────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create unprivileged security group and user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone server
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy and grant permission to entrypoint script
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000

CMD ["./entrypoint.sh"]
