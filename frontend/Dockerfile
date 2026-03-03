FROM node:22-alpine AS builder

WORKDIR /app
# Build context is project root — prefix paths with frontend/
COPY frontend/package*.json ./
RUN npm install
COPY frontend/tsconfig.json frontend/vite.config.ts ./
COPY frontend/index.html frontend/status.html ./
COPY frontend/src ./src

ARG VITE_WS_URL=ws://localhost:4000/ws
ARG VITE_API_URL=http://localhost:4000
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1
