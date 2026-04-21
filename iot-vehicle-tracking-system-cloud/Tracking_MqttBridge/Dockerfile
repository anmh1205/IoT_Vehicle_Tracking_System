FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 bridge
USER bridge
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4003/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))" || exit 1
CMD ["node", "dist/index.js"]
