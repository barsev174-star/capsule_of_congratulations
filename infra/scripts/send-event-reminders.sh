#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.production}"
PRODUCTION_URL="${PRODUCTION_URL:-https://www.darislova.ru}"
LOCK_FILE="${LOCK_FILE:-/tmp/darislova-event-reminders.lock}"

exec 9>"$LOCK_FILE"
if ! flock --nonblock 9; then
  echo "$(date --iso-8601=seconds) reminder batch is already running"
  exit 0
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Environment file not found: $ENV_FILE" >&2
  exit 1
fi

CRON_SECRET="$(grep -E '^CRON_SECRET=' "$ENV_FILE" | tail -1 | cut -d= -f2-)"
if [[ -z "$CRON_SECRET" ]]; then
  echo "CRON_SECRET is missing" >&2
  exit 1
fi

echo "$(date --iso-8601=seconds) starting reminder batch"

curl --fail --silent --show-error \
  --connect-timeout 10 \
  --max-time 120 \
  --retry 2 \
  --retry-all-errors \
  --request POST \
  --header "Authorization: Bearer $CRON_SECRET" \
  "$PRODUCTION_URL/api/internal/reminders/send"
echo
echo "$(date --iso-8601=seconds) reminder batch completed"
