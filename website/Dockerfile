FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY scripts ./scripts
COPY launch-draft ./launch-draft
COPY nginx.conf ./nginx.conf
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
COPY env.js.template /etc/nginx/templates/env.js.template

ENV APP_BASE_URL=https://app.chatzaki.com \
    SITE_URL=https://chatzaki.com \
    WEBSITE_API_BASE_URL=https://api.chatzaki.com \
    ZAKI_WEBSITE_ENVIRONMENT=production \
    NGINX_ENVSUBST_OUTPUT_DIR=/usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
