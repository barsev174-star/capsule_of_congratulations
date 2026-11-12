#!/usr/bin/env bash
set -euo pipefail

# This library is also sourced by deploy-web.sh under the same deployment lock.
WEB_ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WEB_CURRENT_REF=capsule-web:current
WEB_ROLLBACK_REF=capsule-web:rollback

web_image_id() {
  local id
  id="$(docker image inspect --format '{{.Id}}' "$1")" || return 1
  [[ "$id" =~ ^sha256:[0-9a-f]{64}$ ]] || { echo "Invalid image ID for $1" >&2; return 1; }
  printf '%s\n' "$id"
}

web_lock() {
  mkdir -p "$WEB_ROOT_DIR/.deploy"
  exec 9>"$WEB_ROOT_DIR/.deploy/web.lock"
  flock -n 9 || { echo 'Another web deployment or image cleanup is running.' >&2; return 1; }
}

web_assert_running() {
  local expected="$1" state
  state="$(docker inspect --format '{{.Image}} {{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' capsule-web-1)" || return 1
  [[ "$state" == "$expected running healthy" ]] || {
    echo 'The running web image must match the pinned, healthy current image.' >&2
    return 1
  }
}

web_assert_protected() {
  local current="$1" rollback="$2"
  [[ "$current" != "$rollback" ]] || { echo 'Current and rollback must be two distinct images.' >&2; return 1; }
  [[ "$(web_image_id "$WEB_CURRENT_REF")" == "$current" ]] || return 1
  [[ "$(web_image_id "$WEB_ROLLBACK_REF")" == "$rollback" ]] || return 1
  web_assert_running "$current"
}

web_image_in_use() {
  local image="$1" ids images
  # Include stopped containers; Docker errors must abort instead of implying unused.
  ids="$(docker ps -aq)" || return 2
  [[ -n "$ids" ]] || return 1
  local -a containers=()
  mapfile -t containers <<<"$ids"
  images="$(docker inspect --format '{{.Image}}' "${containers[@]}")" || return 2
  grep -Fxq "$image" <<<"$images"
}

cleanup_web_images() {
  local mode="${1:---dry-run}" current rollback inventory repository tag id ref use_status removed=0
  [[ "$mode" == --dry-run || "$mode" == --apply ]] || { echo 'Usage: cleanup-web-images.sh [--dry-run|--apply]' >&2; return 1; }
  current="$(web_image_id "$WEB_CURRENT_REF")" || return 1
  rollback="$(web_image_id "$WEB_ROLLBACK_REF")" || return 1
  web_assert_protected "$current" "$rollback" || return 1
  echo "IMAGE_CLEANUP preserve current=$current rollback=$rollback mode=$mode"
  inventory="$(docker image ls --no-trunc --format '{{.Repository}}|{{.Tag}}|{{.ID}}' capsule-web)" || return 1
  while IFS='|' read -r repository tag id; do
    [[ "$repository" == capsule-web && "$tag" != '<none>' ]] || continue
    [[ "$id" =~ ^sha256:[0-9a-f]{64}$ && "$tag" =~ ^[a-zA-Z0-9_][a-zA-Z0-9_.-]*$ ]] || {
      echo 'Unexpected image inventory; cleanup stopped.' >&2; return 1;
    }
    [[ "$id" == "$current" || "$id" == "$rollback" ]] && continue
    ref="$repository:$tag"
    if web_image_in_use "$id"; then
      echo "IMAGE_CLEANUP skip in-use $ref"
      continue
    else
      use_status=$?
      [[ "$use_status" -eq 1 ]] || { echo 'Could not inspect container image usage.' >&2; return 1; }
    fi
    echo "IMAGE_CLEANUP candidate $ref $id"
    if [[ "$mode" == --apply ]]; then
      web_assert_protected "$current" "$rollback" || return 1
      # Reject tag movement after the inventory snapshot; never remove by image ID.
      [[ "$(web_image_id "$ref")" == "$id" ]] || { echo "Image tag changed: $ref" >&2; return 1; }
      if web_image_in_use "$id"; then
        echo "IMAGE_CLEANUP skip newly in-use $ref"
        continue
      else
        use_status=$?
        [[ "$use_status" -eq 1 ]] || return 1
      fi
      docker image rm "$ref" || return 1
      removed=$((removed + 1))
    fi
  done <<<"$inventory"
  web_assert_protected "$current" "$rollback" || return 1
  echo "IMAGE_CLEANUP complete removed_tags=$removed mode=$mode"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  [[ "$#" -le 1 ]] || { echo 'Usage: cleanup-web-images.sh [--dry-run|--apply]' >&2; exit 1; }
  web_lock
  cleanup_web_images "${1:---dry-run}"
fi
