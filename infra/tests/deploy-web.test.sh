#!/usr/bin/env bash
set -euo pipefail

SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/slovesto-deploy-tests.XXXXXX")"
trap '[[ "$TEST_ROOT" == "${TMPDIR:-/tmp}/slovesto-deploy-tests."* ]] && rm -rf -- "$TEST_ROOT"' EXIT
printf -v CURRENT 'sha256:%064d' 1
printf -v ROLLBACK 'sha256:%064d' 2
printf -v OLD 'sha256:%064d' 3
printf -v OLDEST 'sha256:%064d' 4
printf -v NEW 'sha256:%064d' 5
printf -v FAILED 'sha256:%064d' 6
export CURRENT ROLLBACK OLD OLDEST NEW FAILED
original_path="$PATH"
passed=0

fail() { echo "FAIL: $*" >&2; exit 1; }
has_ref() { grep -Fxq "$1" "$MOCK_DIR/refs" || fail "Missing ref $1"; }
no_removal() { [[ ! -s "$MOCK_DIR/removed" ]] || fail 'Unexpected image removal'; }
expect_failure() { if "$@" >"$MOCK_DIR/output" 2>&1; then fail 'Command unexpectedly succeeded'; fi; }
run_cleanup() { bash "$app/infra/scripts/cleanup-web-images.sh" "$@" >"$MOCK_DIR/output" 2>&1; }
run_deploy() { bash "$app/infra/scripts/deploy-web.sh" "$@" >"$MOCK_DIR/output" 2>&1; }

reset_fixture() {
  app="$(mktemp -d "$TEST_ROOT/case.XXXXXX")"
  export MOCK_DIR="$app/mock"
  mkdir -p "$app/infra/scripts" "$app/bin" "$MOCK_DIR" "$app/public/uploads" "$app/data/public-share-media" "$app/backups"
  cp "$SOURCE_ROOT/infra/scripts/deploy-web.sh" "$SOURCE_ROOT/infra/scripts/cleanup-web-images.sh" "$app/infra/scripts/"
  touch "$app/.env.production" "$app/docker-compose.prod.yml" "$MOCK_DIR/removed" "$MOCK_DIR/events" "$MOCK_DIR/used"
  printf '%s\n' "$CURRENT" >"$MOCK_DIR/running"
  echo healthy >"$MOCK_DIR/health"
  printf 'capsule-web|current|%s\ncapsule-web|rollback|%s\ncapsule-web|latest|%s\ncapsule-web|old|%s\ncapsule-web|old-alias|%s\ncapsule-web|oldest|%s\npostgres|16|%s\npixsave-ssh-tunnel|test|%s\n' \
    "$CURRENT" "$ROLLBACK" "$CURRENT" "$OLD" "$OLD" "$OLDEST" "$OLDEST" "$OLD" >"$MOCK_DIR/refs"
  for file in public/uploads/sentinel data/public-share-media/sentinel backups/sentinel; do echo untouched >"$app/$file"; done
  cat >"$app/infra/scripts/check-production-operations.sh" <<'OPERATIONS'
#!/usr/bin/env bash
set -euo pipefail
echo operations >>"$MOCK_DIR/events"
[[ "${MOCK_OPERATIONS_FAIL:-0}" != 1 ]]
if [[ "${MOCK_POST_OPERATIONS_FAIL:-0}" == 1 && "$(grep -c '^operations$' "$MOCK_DIR/events")" -gt 1 ]]; then exit 1; fi
OPERATIONS
  cat >"$app/infra/scripts/check-production-health.sh" <<'HEALTH'
#!/usr/bin/env bash
set -euo pipefail
echo public-health >>"$MOCK_DIR/events"
[[ "${MOCK_PUBLIC_HEALTH_FAIL:-0}" != 1 ]]
HEALTH
  cat >"$app/bin/docker" <<'DOCKER'
#!/usr/bin/env bash
set -euo pipefail
echo "docker $*" >>"$MOCK_DIR/events"
get_image() {
  if [[ "$1" == sha256:* ]]; then
    awk -F'|' -v id="$1" '$3==id {found=1} END {if(found) print id; else exit 1}' "$MOCK_DIR/refs"
  else
    awk -F'|' -v ref="$1" '$1 ":" $2==ref {print $3; found=1; exit} END {if(!found) exit 1}' "$MOCK_DIR/refs"
  fi
}
set_ref() {
  local id="$1" ref="$2"
  awk -F'|' -v ref="$ref" '$1 ":" $2!=ref' "$MOCK_DIR/refs" >"$MOCK_DIR/next"
  printf '%s|%s|%s\n' "${ref%:*}" "${ref##*:}" "$id" >>"$MOCK_DIR/next"
  mv "$MOCK_DIR/next" "$MOCK_DIR/refs"
}
case "$1" in
  image)
    case "$2" in
      inspect)
        ref="${@: -1}"
        if [[ "${MOCK_MOVED_TAG:-0}" == 1 && "$ref" == capsule-web:old ]]; then set_ref "$CURRENT" "$ref"; fi
        get_image "$ref" ;;
      ls)
        [[ "${MOCK_LIST_FAIL:-0}" != 1 ]] || exit 1
        cat "$MOCK_DIR/refs" ;;
      tag) set_ref "$(get_image "$3")" "$4" ;;
      rm)
        [[ "$#" -eq 3 && "$3" == capsule-web:* && "$3" != -* ]] || exit 91
        [[ "${MOCK_REMOVE_FAIL:-0}" != 1 ]] || exit 1
        echo "$3" >>"$MOCK_DIR/removed"
        awk -F'|' -v ref="$3" '$1 ":" $2!=ref' "$MOCK_DIR/refs" >"$MOCK_DIR/next"
        mv "$MOCK_DIR/next" "$MOCK_DIR/refs" ;;
      *) exit 92 ;;
    esac ;;
  ps)
    echo web
    cut -d'|' -f1 "$MOCK_DIR/used" ;;
  inspect)
    format="$3"
    if [[ "$format" == '{{.Image}}' ]]; then
      [[ "${MOCK_USAGE_FAIL:-0}" != 1 ]] || exit 1
      shift 3
      for container in "$@"; do
        if [[ "$container" == web ]]; then cat "$MOCK_DIR/running"; else awk -F'|' -v c="$container" '$1==c {print $2}' "$MOCK_DIR/used"; fi
      done
      if [[ "${MOCK_NEW_CONTAINER:-0}" == 1 && ! -f "$MOCK_DIR/usage-checked" ]]; then
        echo "new-holder|$OLD" >"$MOCK_DIR/used"
        touch "$MOCK_DIR/usage-checked"
      fi
    else
      printf '%s running %s\n' "$(cat "$MOCK_DIR/running")" "$(cat "$MOCK_DIR/health")"
    fi ;;
  compose)
    case "$6" in
      config) exit 0 ;;
      build)
        [[ "${MOCK_BUILD_FAIL:-0}" != 1 ]] || exit 1
        if [[ "${MOCK_SAME_IMAGE:-0}" == 1 ]]; then set_ref "$CURRENT" capsule-web:latest; else set_ref "$NEW" capsule-web:latest; fi ;;
      up)
        [[ "$*" == *'up -d --no-deps web' ]] || exit 93
        get_image capsule-web:latest >"$MOCK_DIR/running"
        if [[ "${MOCK_UNHEALTHY:-0}" == 1 ]]; then echo unhealthy >"$MOCK_DIR/health"; fi ;;
      *) exit 94 ;;
    esac ;;
  *) exit 95 ;;
esac
DOCKER
  chmod +x "$app/bin/docker"
  export PATH="$app/bin:$original_path"
  unset MOCK_OPERATIONS_FAIL MOCK_POST_OPERATIONS_FAIL MOCK_PUBLIC_HEALTH_FAIL MOCK_BUILD_FAIL MOCK_SAME_IMAGE MOCK_UNHEALTHY MOCK_USAGE_FAIL MOCK_LIST_FAIL MOCK_MOVED_TAG MOCK_REMOVE_FAIL MOCK_NEW_CONTAINER
}

test_dry_run() { run_cleanup; no_removal; grep -q 'mode=--dry-run' "$MOCK_DIR/output"; }
test_cleanup_scope() {
  before="$(sha256sum "$app/public/uploads/sentinel" "$app/data/public-share-media/sentinel" "$app/backups/sentinel")"
  run_cleanup --apply
  [[ "$(wc -l <"$MOCK_DIR/removed")" -eq 3 ]] || fail 'Expected three obsolete tag removals'
  has_ref "capsule-web|current|$CURRENT"; has_ref "capsule-web|rollback|$ROLLBACK"
  has_ref "postgres|16|$OLDEST"; has_ref "pixsave-ssh-tunnel|test|$OLD"
  [[ "$(sha256sum "$app/public/uploads/sentinel" "$app/data/public-share-media/sentinel" "$app/backups/sentinel")" == "$before" ]] || fail 'Data sentinel changed'
  ! grep -Eq 'prune|--force|volume|container rm' "$MOCK_DIR/events" || fail 'Forbidden Docker command'
}
test_stopped_container() {
  echo "stopped-holder|$OLD" >"$MOCK_DIR/used"
  run_cleanup --apply
  has_ref "capsule-web|old|$OLD"; has_ref "capsule-web|old-alias|$OLD"
  [[ "$(wc -l <"$MOCK_DIR/removed")" -eq 1 ]] || fail 'Removed a stopped-container image'
}
test_new_container_race() { export MOCK_NEW_CONTAINER=1; run_cleanup --apply; has_ref "capsule-web|old|$OLD"; has_ref "capsule-web|old-alias|$OLD"; }
test_missing_rollback() { sed -i '/capsule-web|rollback|/d' "$MOCK_DIR/refs"; expect_failure run_cleanup --apply; no_removal; }
test_identical_pins() { sed -i "s/capsule-web|rollback|$ROLLBACK/capsule-web|rollback|$CURRENT/" "$MOCK_DIR/refs"; expect_failure run_cleanup --apply; no_removal; }
test_unhealthy_current() { echo unhealthy >"$MOCK_DIR/health"; expect_failure run_cleanup --apply; no_removal; }
test_usage_error() { export MOCK_USAGE_FAIL=1; expect_failure run_cleanup --apply; no_removal; }
test_inventory_error() { export MOCK_LIST_FAIL=1; expect_failure run_cleanup --apply; no_removal; }
test_tag_race() { export MOCK_MOVED_TAG=1; expect_failure run_cleanup --apply; no_removal; }
test_remove_error() { export MOCK_REMOVE_FAIL=1; expect_failure run_cleanup --apply; no_removal; }
test_deploy_check() { run_deploy --check; no_removal; ! grep -Eq ' compose .* (build|up) ' "$MOCK_DIR/events" || fail 'Check built/restarted web'; }
test_deploy_success() {
  run_deploy
  has_ref "capsule-web|current|$NEW"; has_ref "capsule-web|rollback|$CURRENT"
  [[ "$(wc -l <"$MOCK_DIR/removed")" -eq 4 ]] || fail 'Old rollback should be removed along with older tags'
  ! grep -q "^capsule-web|.*|$ROLLBACK$" "$MOCK_DIR/refs" || fail 'Old rollback tag leaked'
  health_line="$(grep -n '^public-health$' "$MOCK_DIR/events" | cut -d: -f1)"
  cleanup_line="$(grep -n '^docker image rm ' "$MOCK_DIR/events" | head -n 1 | cut -d: -f1)"
  [[ "$health_line" -lt "$cleanup_line" ]] || fail 'Cleanup happened before health'
  [[ "$(grep -c '^operations$' "$MOCK_DIR/events")" -eq 2 ]] || fail 'Missing final operations check'
}
test_same_image() { export MOCK_SAME_IMAGE=1; run_deploy; has_ref "capsule-web|current|$CURRENT"; has_ref "capsule-web|rollback|$ROLLBACK"; }
test_failed_latest_retry() {
  sed -i "s/capsule-web|latest|$CURRENT/capsule-web|latest|$FAILED/" "$MOCK_DIR/refs"
  run_deploy
  has_ref "capsule-web|current|$NEW"; has_ref "capsule-web|rollback|$CURRENT"
  ! grep -q "^capsule-web|.*|$FAILED$" "$MOCK_DIR/refs" || fail 'Stale failed latest leaked'
}
test_build_failure() { export MOCK_BUILD_FAIL=1; expect_failure run_deploy; no_removal; has_ref "capsule-web|current|$CURRENT"; has_ref "capsule-web|rollback|$ROLLBACK"; }
test_new_unhealthy() { export MOCK_UNHEALTHY=1; expect_failure run_deploy; no_removal; has_ref "capsule-web|current|$CURRENT"; has_ref "capsule-web|rollback|$ROLLBACK"; }
test_public_health_failure() { export MOCK_PUBLIC_HEALTH_FAIL=1; expect_failure run_deploy; no_removal; has_ref "capsule-web|current|$CURRENT"; has_ref "capsule-web|rollback|$ROLLBACK"; }
test_preflight_failure() { export MOCK_OPERATIONS_FAIL=1; expect_failure run_deploy; no_removal; ! grep -q 'docker image tag' "$MOCK_DIR/events" || fail 'Preflight failure changed tags'; }
test_final_operations_failure() { export MOCK_POST_OPERATIONS_FAIL=1; expect_failure run_deploy; has_ref "capsule-web|current|$NEW"; has_ref "capsule-web|rollback|$CURRENT"; ! grep -q DEPLOY_OK "$MOCK_DIR/output" || fail 'Failed operations reported success'; }
test_parallel_lock() {
  mkdir -p "$app/.deploy"
  expect_failure bash -c 'exec 8>"$1"; flock -n 8; bash "$2" --apply' _ "$app/.deploy/web.lock" "$app/infra/scripts/cleanup-web-images.sh"
  no_removal
}

for test in test_dry_run test_cleanup_scope test_stopped_container test_new_container_race test_missing_rollback test_identical_pins test_unhealthy_current test_usage_error test_inventory_error test_tag_race test_remove_error test_deploy_check test_deploy_success test_same_image test_failed_latest_retry test_build_failure test_new_unhealthy test_public_health_failure test_preflight_failure test_final_operations_failure test_parallel_lock; do
  reset_fixture
  "$test"
  passed=$((passed + 1))
  echo "PASS $test"
done
echo "Deployment tests passed: $passed (isolated fake Docker; no real images or data accessed)."
