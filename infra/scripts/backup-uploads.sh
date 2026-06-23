#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
UPLOADS_DIR="${UPLOADS_DIR:-$ROOT_DIR/public/uploads/cards}"
BACKUP_FILE="${1:-$BACKUP_DIR/uploads-$TIMESTAMP.tar.gz}"

mkdir -p "$(dirname "$BACKUP_FILE")"

if [[ ! -d "$UPLOADS_DIR" ]]; then
  echo "Uploads directory does not exist, creating empty backup: $UPLOADS_DIR"
  mkdir -p "$UPLOADS_DIR"
fi

echo "Creating uploads backup: $BACKUP_FILE"
tar -czf "$BACKUP_FILE" -C "$UPLOADS_DIR" .

echo "Uploads backup completed: $BACKUP_FILE"
