#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${PROD_ENV_FILE:-$ROOT_DIR/.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.prod.yml}"
# shellcheck source=cleanup-web-images.sh
source "$ROOT_DIR/infra/scripts/cleanup-web-images.sh"

[[ "$#" -le 1 && ( "${1:-}" == '' || "${1:-}" == --check ) ]] || {
  echo 'Usage: deploy-web.sh [--check]' >&2; exit 1;
}
[[ -f "$ENV_FILE" && -f "$COMPOSE_FILE" ]] || { echo 'Production env/Compose file not found.' >&2; exit 1; }
cd "$ROOT_DIR"
export PROD_ENV_FILE="$ENV_FILE"
web_lock
compose=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
"${compose[@]}" config --quiet
previous="$(web_image_id "$WEB_CURRENT_REF")"
previous_rollback="$(web_image_id "$WEB_ROLLBACK_REF")"
web_assert_protected "$previous" "$previous_rollback"
bash "$ROOT_DIR/infra/scripts/check-production-operations.sh"

if [[ "${1:-}" == --check ]]; then
  cleanup_web_images --dry-run
  echo 'DEPLOY_CHECK passed; no build, restart or image removal.'
  exit 0
fi

deploy_stage=build
trap 'status=$?; if [[ "$status" -ne 0 ]]; then echo "DEPLOY_FAILED stage=$deploy_stage: inspect image pins and logs before retrying." >&2; fi' EXIT
echo "DEPLOY_START previous=$previous rollback=$previous_rollback"
# Pin the working baseline while Compose replaces its latest tag during build.
docker image tag "$previous" capsule-web:deploy-previous
# Keep displaced tags addressable by repository until successful cleanup; do not
# orphan the old rollback as an unidentifiable dangling image when rotating it.
docker image tag "$previous_rollback" capsule-web:deploy-old-rollback
if old_latest="$(docker image inspect --format '{{.Id}}' capsule-web:latest 2>/dev/null)"; then
  [[ "$old_latest" =~ ^sha256:[0-9a-f]{64}$ ]] || exit 1
  docker image tag "$old_latest" capsule-web:deploy-old-latest
fi
"${compose[@]}" build web
candidate="$(web_image_id capsule-web:latest)"
"${compose[@]}" up -d --no-deps web
deploy_stage=health

ready=false
for ((attempt = 1; attempt <= 36; attempt++)); do
  state="$(docker inspect --format '{{.Image}} {{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' capsule-web-1)"
  echo "DEPLOY_HEALTH attempt=$attempt state=$state"
  [[ "$state" == "$candidate running healthy" ]] && { ready=true; break; }
  [[ "$state" == "$candidate running starting" ]] || { echo 'New web is not starting/healthy.' >&2; exit 1; }
  sleep 5
done
[[ "$ready" == true ]] || { echo 'Timed out waiting for new web health.' >&2; exit 1; }
bash "$ROOT_DIR/infra/scripts/check-production-health.sh"

if [[ "$candidate" != "$previous" ]]; then
  docker image tag "$previous" "$WEB_ROLLBACK_REF"
  docker image tag "$candidate" "$WEB_CURRENT_REF"
else
  echo 'DEPLOY_UNCHANGED: keep the existing rollback image.'
fi
deploy_stage=cleanup
cleanup_web_images --apply
deploy_stage=operations
bash "$ROOT_DIR/infra/scripts/check-production-operations.sh"
echo "DEPLOY_OK current=$candidate rollback=$(web_image_id "$WEB_ROLLBACK_REF")"
