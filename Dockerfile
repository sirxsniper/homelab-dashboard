# ── Stage 1: Build frontend ──
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Install backend dependencies ──
FROM node:22-alpine AS backend-deps
RUN apk add --no-cache python3 make g++
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev

# ── Stage 3: Production image ──
FROM node:22-alpine

# Upgrade all base packages (fixes CVEs in zlib, busybox, etc), install nginx/iperf3,
# remove npm (not needed at runtime)
RUN apk upgrade --no-cache \
    && apk add --no-cache nginx iperf3 \
    && mkdir -p /run/nginx \
    && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

WORKDIR /app

# Copy backend with pre-built native modules
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY backend/package.json ./backend/
COPY backend/src ./backend/src
COPY backend/ecosystem.config.js ./backend/
COPY backend/.env.example ./backend/

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create data directory
RUN mkdir -p /app/backend/data

# Nginx config
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# Entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q --spider http://127.0.0.1/api/health || exit 1

# Volume for persistent data (DB + secrets)
VOLUME ["/app/backend/data"]

ENTRYPOINT ["/entrypoint.sh"]
