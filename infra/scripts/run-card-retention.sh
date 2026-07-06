#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${PROD_ENV_FILE:-$ROOT_DIR/.env.production}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${CRON_SECRET:?CRON_SECRET is required}"
BASE_URL="${NEXT_PUBLIC_SITE_URL:-https://www.darislova.ru}"

curl --fail --silent --show-error \
  --connect-timeout 10 \
  --max-time 120 \
  --retry 2 \
  --request POST \
  --header "Authorization: Bearer $CRON_SECRET" \
  "$BASE_URL/api/internal/retention/run"

echo
