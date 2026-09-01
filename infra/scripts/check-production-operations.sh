#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
MAX_BACKUP_AGE_HOURS="${MAX_BACKUP_AGE_HOURS:-30}"
MAX_DISK_USAGE_PERCENT="${MAX_DISK_USAGE_PERCENT:-90}"

bash "$ROOT_DIR/infra/scripts/check-production-health.sh"

for file in postgres-latest.sql.gz uploads-latest.tar.gz; do
  target="$BACKUP_DIR/$file"
  if [[ ! -s "$target" ]]; then
    echo "Missing or empty backup: $target" >&2
    exit 1
  fi
  age_seconds=$(( $(date +%s) - $(stat -c %Y "$target") ))
  if (( age_seconds > MAX_BACKUP_AGE_HOURS * 3600 )); then
    echo "Backup is older than ${MAX_BACKUP_AGE_HOURS}h: $target" >&2
    exit 1
  fi
done

disk_usage="$(df -P "$ROOT_DIR" | awk 'NR==2 {gsub(/%/, "", $5); print $5}')"
if [[ ! "$disk_usage" =~ ^[0-9]+$ ]]; then
  echo "Could not determine disk usage" >&2
  exit 1
fi
if (( disk_usage >= MAX_DISK_USAGE_PERCENT )); then
  echo "Disk usage is ${disk_usage}%, threshold is ${MAX_DISK_USAGE_PERCENT}%" >&2
  exit 1
fi

echo "Production operational checks passed: backups are fresh, disk usage is ${disk_usage}%"
