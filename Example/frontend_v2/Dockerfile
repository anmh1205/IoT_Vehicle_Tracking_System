# =============================================================
# Multi-stage Dockerfile for the IVM26 Next.js dashboard v2
# Supports development parity, staging, and production deployments.
# The API base URL is injected via build arguments and environment variables.
# =============================================================

ARG NODE_VERSION=20-alpine

# ------------------------------
# Stage 1: Install dependencies
# ------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# Copy dependency manifests first to leverage Docker cache
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --legacy-peer-deps

# ------------------------------
# Stage 2: Build application
# ------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

# Ensure the public directory always exists so the runtime copy succeeds
RUN mkdir -p public

# Build-time environment
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
ARG NEXT_PUBLIC_WS_URL=http://localhost:3000
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Helpful log to confirm build
RUN echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" && \
  echo "🏗️  Building Next.js app v2" && \
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RUN npm run build

# ------------------------------
# Stage 3: Runtime image
# ------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
ARG NEXT_PUBLIC_WS_URL=http://localhost:3000
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}

# Configure timezone for Vietnam
RUN apk add --no-cache tzdata && \
  cp /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime && \
  echo "Asia/Ho_Chi_Minh" > /etc/timezone

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs

# Copy the build output
# Note: If using standalone output, adjust paths accordingly
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3002

CMD ["node", "server.js"]


