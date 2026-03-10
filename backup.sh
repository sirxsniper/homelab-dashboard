#!/bin/bash
# Homelab Dashboard backup script

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEST="${BACKUP_DIR:-/var/backups/homelab}"

mkdir -p "$DEST"

# SQLite hot backup (safe while running)
sqlite3 "$SCRIPT_DIR/backend/data/homelab.db" \
  ".backup '$DEST/homelab_${TIMESTAMP}.db'"

# Env file
cp "$SCRIPT_DIR/backend/.env" "$DEST/env_${TIMESTAMP}.bak" 2>/dev/null

# Keep last 30 days only
find "$DEST" -name "homelab_*.db" -mtime +30 -delete
find "$DEST" -name "env_*.bak" -mtime +30 -delete

echo "[$(date)] Backup completed: $DEST"
