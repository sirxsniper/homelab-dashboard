#!/bin/sh
set -e

cd /app/backend

SECRETS_FILE="/app/backend/data/.secrets"

# Load persisted secrets if they exist (survives container restarts)
if [ -f "$SECRETS_FILE" ]; then
  . "$SECRETS_FILE"
fi

# Generate and persist secrets if not set
generate_secret() {
  head -c 32 /dev/urandom | od -A n -t x1 | tr -d ' \n'
}

DIRTY=0

if [ -z "$JWT_ACCESS_SECRET" ] || [ "$JWT_ACCESS_SECRET" = "CHANGE_ME_generate_with_openssl_rand_hex_32" ]; then
  export JWT_ACCESS_SECRET=$(generate_secret)
  echo "[Init] Generated JWT_ACCESS_SECRET"
  DIRTY=1
fi
if [ -z "$JWT_REFRESH_SECRET" ] || [ "$JWT_REFRESH_SECRET" = "CHANGE_ME_generate_with_openssl_rand_hex_32" ]; then
  export JWT_REFRESH_SECRET=$(generate_secret)
  echo "[Init] Generated JWT_REFRESH_SECRET"
  DIRTY=1
fi
if [ -z "$CREDENTIAL_ENCRYPTION_KEY" ] || [ "$CREDENTIAL_ENCRYPTION_KEY" = "CHANGE_ME_generate_with_openssl_rand_hex_32" ]; then
  export CREDENTIAL_ENCRYPTION_KEY=$(generate_secret)
  echo "[Init] Generated CREDENTIAL_ENCRYPTION_KEY"
  DIRTY=1
fi

# Persist secrets to data volume so they survive restarts
if [ "$DIRTY" = "1" ]; then
  cat > "$SECRETS_FILE" <<EOL
export JWT_ACCESS_SECRET="$JWT_ACCESS_SECRET"
export JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
export CREDENTIAL_ENCRYPTION_KEY="$CREDENTIAL_ENCRYPTION_KEY"
EOL
  chmod 600 "$SECRETS_FILE"
  echo "[Init] Secrets saved to data volume"
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
