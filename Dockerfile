FROM node:22-alpine AS base
RUN npm install -g npm@11.17.0


FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment configuration for production build phase
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Production Build Arguments (can be passed via --build-arg or read from build environment)
ARG DATABASE_URL="postgresql://mock:mock@localhost:5432/mock"
ARG DATABASE_SSL_REJECT_UNAUTHORIZED="false"
ARG BETTER_AUTH_SECRET="build-placeholder-secret-minimum-32-characters"
ARG NEXT_PUBLIC_APP_URL="https://1onlysarkar.shop"
ARG GOOGLE_CLIENT_ID=""
ARG GOOGLE_CLIENT_SECRET=""
ARG INDEXNOW_KEY=""
ARG TRUSTED_ORIGINS=""

# Set Environment Variables available during `npm run build`
ENV DATABASE_URL=${DATABASE_URL}
ENV DATABASE_SSL_REJECT_UNAUTHORIZED=${DATABASE_SSL_REJECT_UNAUTHORIZED}
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
ENV GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
ENV INDEXNOW_KEY=${INDEXNOW_KEY}
ENV TRUSTED_ORIGINS=${TRUSTED_ORIGINS}

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set correct ownership for public assets and database files
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/db ./db
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

