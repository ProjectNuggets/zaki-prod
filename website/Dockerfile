FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production image
FROM nginx:1.27-alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config for SPA + static files
RUN printf 'server {\n\
  listen 80;\n\
  server_name _;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  \n\
  # Gzip compression\n\
  gzip on;\n\
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;\n\
  gzip_min_length 1000;\n\
  \n\
  # Cache static assets\n\
  location /assets/ {\n\
    expires 1y;\n\
    add_header Cache-Control "public, immutable";\n\
  }\n\
  \n\
  location /slides/ {\n\
    expires 7d;\n\
    add_header Cache-Control "public";\n\
  }\n\
  \n\
  # Static pages (terms, privacy, etc.)\n\
  location ~ ^/(terms|privacy|compliance|contact|faq|ar)/ {\n\
    try_files $uri $uri/ $uri/index.html =404;\n\
  }\n\
  \n\
  # SPA fallback\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
  \n\
  # Security headers\n\
  add_header X-Frame-Options "SAMEORIGIN" always;\n\
  add_header X-Content-Type-Options "nosniff" always;\n\
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n\
}\n' > /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
