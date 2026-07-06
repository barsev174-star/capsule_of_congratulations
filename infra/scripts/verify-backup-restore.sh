#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${PROD_ENV_FILE:-$ROOT_DIR/.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
POSTGRES_BACKUP="${1:-$BACKUP_DIR/postgres-latest.sql.gz}"
UPLOADS_BACKUP="${2:-$BACKUP_DIR/uploads-latest.tar.gz}"
RESTORE_DB="capsule_restore_check_$(date +%s)"
EXTRACT_DIR="$(mktemp -d)"
EXPECTED_MIGRATIONS="$(find "$ROOT_DIR/migrations" -maxdepth 1 -type f -name '*.sql' | wc -l | tr -d '[:space:]')"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${POSTGRES_USER:?POSTGRES_USER is required}"

cleanup() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
    psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$RESTORE_DB\";" >/dev/null || true
  rm -rf "$EXTRACT_DIR"
}
trap cleanup EXIT

[[ -f "$POSTGRES_BACKUP" ]] || { echo "PostgreSQL backup not found: $POSTGRES_BACKUP"; exit 1; }
[[ -f "$UPLOADS_BACKUP" ]] || { echo "Uploads backup not found: $UPLOADS_BACKUP"; exit 1; }

if [[ -f "$POSTGRES_BACKUP.sha256" ]]; then
  sha256sum -c "$POSTGRES_BACKUP.sha256"
fi
if [[ -f "$UPLOADS_BACKUP.sha256" ]]; then
  sha256sum -c "$UPLOADS_BACKUP.sha256"
fi

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$RESTORE_DB\";" >/dev/null

gzip -dc "$POSTGRES_BACKUP" | docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$RESTORE_DB" -v ON_ERROR_STOP=1 >/dev/null

MIGRATION_COUNT="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$RESTORE_DB" -tAc "SELECT count(*) FROM schema_migrations;")"

if [[ "${MIGRATION_COUNT//[[:space:]]/}" -lt "$EXPECTED_MIGRATIONS" ]]; then
  echo "Restored database has fewer than $EXPECTED_MIGRATIONS migrations: $MIGRATION_COUNT"
  exit 1
fi

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$RESTORE_DB" -tAc \
  "SELECT to_regclass('public.cards') IS NOT NULL AND to_regclass('public.contributions') IS NOT NULL;" | grep -qx t

tar -tzf "$UPLOADS_BACKUP" >/dev/null
tar -xzf "$UPLOADS_BACKUP" -C "$EXTRACT_DIR"

echo "Backup restore verification passed: migrations=$MIGRATION_COUNT"
