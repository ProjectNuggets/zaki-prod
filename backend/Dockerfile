FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install dependencies first (for layer caching)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy application code
COPY src/ ./src/

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8787/health || exit 1

EXPOSE 8787

CMD ["node", "src/index.js"]
