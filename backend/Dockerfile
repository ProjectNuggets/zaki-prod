FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install dependencies first (for layer caching)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy application code
COPY src/ ./src/
# Maintenance/migration scripts (e.g. reembed-memories.mjs) so they can run
# in-cluster as a one-off Job/exec without a ConfigMap mount.
COPY scripts/ ./scripts/

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8787/health || exit 1

EXPOSE 8787

# --import preloads Sentry/GlitchTip instrumentation before app modules load (ESM auto-instrumentation).
CMD ["node", "--import", "./src/instrument.mjs", "src/index.js"]
