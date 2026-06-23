#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
POSTGRES_BACKUP_FILE="$BACKUP_DIR/postgres-$TIMESTAMP.sql.gz"
UPLOADS_BACKUP_FILE="$BACKUP_DIR/uploads-$TIMESTAMP.tar.gz"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
RUN_HEALTHCHECK_AFTER_BACKUP="${RUN_HEALTHCHECK_AFTER_BACKUP:-0}"

mkdir -p "$BACKUP_DIR"

echo "Starting nightly backup job"
bash "$ROOT_DIR/infra/scripts/backup-postgres.sh" "$POSTGRES_BACKUP_FILE"
bash "$ROOT_DIR/infra/scripts/backup-uploads.sh" "$UPLOADS_BACKUP_FILE"

sha256sum "$POSTGRES_BACKUP_FILE" > "$POSTGRES_BACKUP_FILE.sha256"
sha256sum "$UPLOADS_BACKUP_FILE" > "$UPLOADS_BACKUP_FILE.sha256"

ln -sfn "$(basename "$POSTGRES_BACKUP_FILE")" "$BACKUP_DIR/postgres-latest.sql.gz"
ln -sfn "$(basename "$POSTGRES_BACKUP_FILE").sha256" "$BACKUP_DIR/postgres-latest.sql.gz.sha256"
ln -sfn "$(basename "$UPLOADS_BACKUP_FILE")" "$BACKUP_DIR/uploads-latest.tar.gz"
ln -sfn "$(basename "$UPLOADS_BACKUP_FILE").sha256" "$BACKUP_DIR/uploads-latest.tar.gz.sha256"

echo "Checksums created"
RETENTION_DAYS="$RETENTION_DAYS" BACKUP_DIR="$BACKUP_DIR" bash "$ROOT_DIR/infra/scripts/cleanup-old-backups.sh"

if [[ "$RUN_HEALTHCHECK_AFTER_BACKUP" == "1" ]]; then
  bash "$ROOT_DIR/infra/scripts/check-production-health.sh"
fi

echo "Nightly backup job completed"
