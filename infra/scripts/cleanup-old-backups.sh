#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "Backup directory does not exist, nothing to clean: $BACKUP_DIR"
  exit 0
fi

echo "Removing backups older than $RETENTION_DAYS days from $BACKUP_DIR"
find "$BACKUP_DIR" -type f \( -name "postgres-*.sql.gz" -o -name "uploads-*.tar.gz" -o -name "*.sha256" \) -mtime +"$RETENTION_DAYS" -print -delete

echo "Backup cleanup completed"
