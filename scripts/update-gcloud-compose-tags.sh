#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${1:-docker-compose.yaml}"
GCLOUD_TAG="52cb0c31"
PRINT_TAG="1972657"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "File not found: $COMPOSE_FILE" >&2
  exit 1
fi

cp "$COMPOSE_FILE" "$COMPOSE_FILE.bak"

sed -i \
  -e "s#registry\.kontur\.ru/gcloud/gcloud-print:[^[:space:]]*#registry.kontur.ru/gcloud/gcloud-print:${PRINT_TAG}#g" \
  -e "s#registry\.kontur\.ru/gcloud/gcloud:[^[:space:]]*#registry.kontur.ru/gcloud/gcloud:${GCLOUD_TAG}#g" \
  "$COMPOSE_FILE"

echo "Updated $COMPOSE_FILE"
echo "Backup saved as $COMPOSE_FILE.bak"
