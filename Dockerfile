# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=20-alpine

# ── base ──────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* .npmrc* ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ── builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=1
ENV NODE_OPTIONS=--max-old-space-size=4096

COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY .env.production ./.env.production

RUN --mount=type=cache,target=/app/.next/cache npm run build && rm -f .env.production

# ── runner ────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001 -G nodejs

# 🟢 FIXED: Kept standalone structure intact and nested assets properly
COPY --from=builder /app/public ./public

# Automatically leverages standalone output folder correctly
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# 🟢 FIXED: Changed healthcheck destination to Next.js internal health indicator
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
