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

echo "Checking landing page: $BASE_URL"
curl --fail --silent --show-error --location --head "$BASE_URL" >/dev/null

echo "Checking create page: $BASE_URL/create"
curl --fail --silent --show-error --location --head "$BASE_URL/create" >/dev/null

echo "Production health checks passed"
