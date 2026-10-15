# ---------------------------------------------------------------------------
# 1. deps — install node_modules in an isolated, cacheable layer
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
# openssl is required by the Prisma query engine on Alpine. The CDN can fail
# transiently (DNS), so retry a few times before giving up.
RUN for i in 1 2 3 4 5; do \
      apk add --no-cache openssl && exit 0; \
      echo "apk add failed (attempt $i), retrying in 5s..."; sleep 5; \
    done; exit 1
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# Retry-friendly install for slow/flaky registries.
RUN npm ci --no-audit --no-fund \
      --fetch-retries=5 --fetch-retry-mintimeout=2000 \
      --fetch-retry-maxtimeout=60000 --fetch-timeout=600000

# ---------------------------------------------------------------------------
# 2. builder — generate Prisma client and compile the Next.js app
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
RUN for i in 1 2 3 4 5; do \
      apk add --no-cache openssl && exit 0; \
      echo "apk add failed (attempt $i), retrying in 5s..."; sleep 5; \
    done; exit 1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Generate the Prisma client against the schema before building (retry engine download).
RUN for i in 1 2 3; do \
      npx prisma generate && exit 0; \
      echo "prisma generate failed (attempt $i), retrying in 5s..."; sleep 5; \
    done; exit 1
RUN npm run build

# ---------------------------------------------------------------------------
# 3. runner — minimal production image (Next.js standalone output)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
RUN for i in 1 2 3 4 5; do \
      apk add --no-cache openssl && exit 0; \
      echo "apk add failed (attempt $i), retrying in 5s..."; sleep 5; \
    done; exit 1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Static assets and public files.
COPY --from=builder /app/public ./public
# The self-contained server bundle and its traced dependencies.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma schema is needed at runtime (and by the migrate service).
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Ensure the Prisma engine is present even after standalone tracing.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
