#!/bin/sh
set -e

cd /app/backend

# Auto-generate secrets if not provided
if [ "$JWT_ACCESS_SECRET" = "" ] || [ "$JWT_ACCESS_SECRET" = "CHANGE_ME_generate_with_openssl_rand_hex_32" ]; then
  export JWT_ACCESS_SECRET=$(head -c 32 /dev/urandom | od -A n -t x1 | tr -d ' \n')
  echo "[Init] Auto-generated JWT_ACCESS_SECRET"
fi
if [ "$JWT_REFRESH_SECRET" = "" ] || [ "$JWT_REFRESH_SECRET" = "CHANGE_ME_generate_with_openssl_rand_hex_32" ]; then
  export JWT_REFRESH_SECRET=$(head -c 32 /dev/urandom | od -A n -t x1 | tr -d ' \n')
  echo "[Init] Auto-generated JWT_REFRESH_SECRET"
fi
if [ "$CREDENTIAL_ENCRYPTION_KEY" = "" ] || [ "$CREDENTIAL_ENCRYPTION_KEY" = "CHANGE_ME_generate_with_openssl_rand_hex_32" ]; then
  export CREDENTIAL_ENCRYPTION_KEY=$(head -c 32 /dev/urandom | od -A n -t x1 | tr -d ' \n')
  echo "[Init] Auto-generated CREDENTIAL_ENCRYPTION_KEY"
fi

# Defaults
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3001}"
export BIND_HOST="${BIND_HOST:-0.0.0.0}"
export DB_PATH="${DB_PATH:-./data/homelab.db}"
export INITIAL_ADMIN_USER="${INITIAL_ADMIN_USER:-admin}"
export INITIAL_ADMIN_PASS="${INITIAL_ADMIN_PASS:-changeme}"
export JWT_ACCESS_EXPIRY="${JWT_ACCESS_EXPIRY:-15m}"
export JWT_REFRESH_EXPIRY="${JWT_REFRESH_EXPIRY:-7d}"

# Ensure data directory exists
mkdir -p "$(dirname "$DB_PATH")"

# Start nginx in background
nginx

echo "[Init] Starting Homelab Dashboard..."
echo "[Init] Default login: $INITIAL_ADMIN_USER / $INITIAL_ADMIN_PASS"
echo "[Init] Change your password after first login!"

# Start backend (foreground)
exec node src/server.js
