FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_ZAKI_BACKEND_URL=/api
ENV VITE_ZAKI_BACKEND_URL=${VITE_ZAKI_BACKEND_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Runtime config: nginx runs every /docker-entrypoint.d/*.sh at start. This writes /env.js from the
# BACKEND_URL container env so one image serves any environment (no build-time URL baking).
COPY docker-entrypoint.d/40-zaki-env.sh /docker-entrypoint.d/40-zaki-env.sh
RUN chmod +x /docker-entrypoint.d/40-zaki-env.sh

RUN printf 'server {\n  listen 80;\n  server_name _;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
