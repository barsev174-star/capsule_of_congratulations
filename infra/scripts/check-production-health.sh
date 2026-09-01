#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${PROD_ENV_FILE:-$ROOT_DIR/.env.production}"
BASE_URL="${BASE_URL:-}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  BASE_URL="${BASE_URL:-${NEXT_PUBLIC_SITE_URL:-}}"
fi

BASE_URL="${BASE_URL:-https://slovesto.ru}"

MAX_TIME_SECONDS="${HEALTH_MAX_TIME_SECONDS:-12}"

check_url() {
  local label="$1"
  local url="$2"
  echo "Checking $label: $url"
  curl --fail --silent --show-error --location --max-time "$MAX_TIME_SECONDS" "$url" >/dev/null
}

check_url "application readiness" "$BASE_URL/api/health"
check_url "landing page" "$BASE_URL"
check_url "managed-card start page" "$BASE_URL/manage/new"
check_url "example page" "$BASE_URL/example"
check_url "privacy page" "$BASE_URL/privacy"
check_url "robots" "$BASE_URL/robots.txt"
check_url "sitemap" "$BASE_URL/sitemap.xml"

HEADERS="$(curl --fail --silent --show-error --head --max-time "$MAX_TIME_SECONDS" "$BASE_URL")"
for header in content-security-policy referrer-policy strict-transport-security x-content-type-options x-frame-options permissions-policy; do
  if ! grep -qi "^${header}:" <<<"$HEADERS"; then
    echo "Missing required security header: $header" >&2
    exit 1
  fi
done

if ! grep -qi '^x-content-type-options: nosniff' <<<"$HEADERS"; then
  echo "Invalid X-Content-Type-Options header" >&2
  exit 1
fi

echo "Production health checks passed"
