#!/usr/bin/env bash
set -euo pipefail

# Reports test-user data by default. To delete it, set BOTH confirmation values
# exactly as documented in docs/REBRANDING_AND_DOMAIN_MIGRATION.md.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${PROD_ENV_FILE:-$ROOT_DIR/.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.prod.yml}"
UPLOADS_DIR="${UPLOADS_DIR:-$ROOT_DIR/public/uploads/cards}"
EXECUTE="${CONFIRM_TEST_DATA_CLEANUP:-}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Production env file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

psql() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"
}

echo "Test-data cleanup report for database: $POSTGRES_DB"
psql -t -A -F '|' -c "
  SELECT 'cards', count(*) FROM cards
  UNION ALL SELECT 'contributions', count(*) FROM contributions
  UNION ALL SELECT 'card_media_assets', count(*) FROM card_media_assets
  UNION ALL SELECT 'gift_polls', count(*) FROM gift_polls
  UNION ALL SELECT 'gift_poll_options', count(*) FROM gift_poll_options
  UNION ALL SELECT 'gift_votes', count(*) FROM gift_votes
  UNION ALL SELECT 'event_reminders', count(*) FROM event_reminders
  UNION ALL SELECT 'organizer_magic_links', count(*) FROM organizer_magic_links
  UNION ALL SELECT 'payment_orders', count(*) FROM payment_orders
  UNION ALL SELECT 'ai_usage_events', count(*) FROM ai_usage_events
  UNION ALL SELECT 'ai_generation_drafts', count(*) FROM ai_generation_drafts
  UNION ALL SELECT 'ai_card_insights', count(*) FROM ai_card_insights
  UNION ALL SELECT 'ai_card_allowances', count(*) FROM ai_card_allowances
  UNION ALL SELECT 'telemetry_events', count(*) FROM telemetry_events
  UNION ALL SELECT 'support_requests', count(*) FROM support_requests
  ORDER BY 1;
"

if [[ -d "$UPLOADS_DIR" ]]; then
  echo "upload_files|$(find "$UPLOADS_DIR" -type f | wc -l | tr -d '[:space:]')"
else
  echo "upload_files|0"
fi

if [[ "$EXECUTE" != "DELETE_TEST_DATA" ]]; then
  echo "Dry run only. No data was deleted."
  echo "To execute after a verified backup: BACKUP_CONFIRMED=YES CONFIRM_TEST_DATA_CLEANUP=DELETE_TEST_DATA bash infra/scripts/clear-test-data-for-public-launch.sh"
  exit 0
fi

if [[ "${BACKUP_CONFIRMED:-}" != "YES" ]]; then
  echo "Refusing deletion: set BACKUP_CONFIRMED=YES only after verifying PostgreSQL and uploads backups." >&2
  exit 1
fi

echo "Deleting test user data from PostgreSQL..."
psql -v ON_ERROR_STOP=1 -c "
  BEGIN;
  TRUNCATE TABLE
    gift_votes,
    gift_poll_options,
    gift_polls,
    ai_generation_drafts,
    ai_usage_events,
    ai_card_insights,
    ai_card_allowances,
    payment_orders,
    card_media_assets,
    contributions,
    cards,
    event_reminders,
    organizer_magic_links,
    telemetry_events,
    support_requests
  RESTART IDENTITY;
  COMMIT;
"

if [[ -d "$UPLOADS_DIR" ]]; then
  echo "Deleting card upload files from: $UPLOADS_DIR"
  find "$UPLOADS_DIR" -mindepth 1 -type f -print -delete
  find "$UPLOADS_DIR" -mindepth 1 -type d -empty -delete
fi

echo "Cleanup completed. Remaining user-data counts:"
psql -t -A -F '|' -c "
  SELECT 'cards', count(*) FROM cards
  UNION ALL SELECT 'contributions', count(*) FROM contributions
  UNION ALL SELECT 'card_media_assets', count(*) FROM card_media_assets
  UNION ALL SELECT 'event_reminders', count(*) FROM event_reminders
  UNION ALL SELECT 'telemetry_events', count(*) FROM telemetry_events
  UNION ALL SELECT 'support_requests', count(*) FROM support_requests
  ORDER BY 1;
"
