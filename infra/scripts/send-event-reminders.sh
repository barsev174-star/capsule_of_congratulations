#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.production}"
PRODUCTION_URL="${PRODUCTION_URL:-https://darislova.ru}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Environment file not found: $ENV_FILE" >&2
  exit 1
fi

CRON_SECRET="$(grep -E '^CRON_SECRET=' "$ENV_FILE" | tail -1 | cut -d= -f2-)"
if [[ -z "$CRON_SECRET" ]]; then
  echo "CRON_SECRET is missing" >&2
  exit 1
fi

curl --fail --silent --show-error --request POST \
  --header "Authorization: Bearer $CRON_SECRET" \
  "$PRODUCTION_URL/api/internal/reminders/send"
echo
