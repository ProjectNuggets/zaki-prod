FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV VITE_APP_BASE_URL=https://zaki-app-base-url.invalid \
    VITE_SITE_URL=https://zaki-site-url.invalid \
    VITE_WEBSITE_API_BASE_URL=https://zaki-website-api-base-url.invalid \
    VITE_ZAKI_WEBSITE_ENVIRONMENT=__ZAKI_WEBSITE_ENVIRONMENT__
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker-entrypoint.d/40-zaki-website-env.sh /docker-entrypoint.d/40-zaki-website-env.sh
RUN chmod +x /docker-entrypoint.d/40-zaki-website-env.sh

RUN printf 'server {\n  listen 80;\n  server_name _;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri $uri.html $uri/index.html /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
