#!/usr/bin/env bash
set -euo pipefail

SERVICE_DIR="${1:-}"
COMPOSE_FILE="${2:-docker-compose.yml}"
POSTGRES_SERVICE_NAME="${POSTGRES_SERVICE_NAME:-postgres}"
POSTGRES_READY_ATTEMPTS="${POSTGRES_READY_ATTEMPTS:-20}"
POSTGRES_READY_INTERVAL_SECONDS="${POSTGRES_READY_INTERVAL_SECONDS:-3}"
POSTGRES_MIGRATION_NODE_IMAGE="${POSTGRES_MIGRATION_NODE_IMAGE:-node:20-alpine}"

if [ -z "$SERVICE_DIR" ]; then
  echo "Usage: sync-postgres-schema.sh <service_dir> [compose_file]"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required on VPS"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose plugin is required on VPS"
  exit 1
fi

if [ ! -f "$SERVICE_DIR/$COMPOSE_FILE" ]; then
  echo "Missing compose file: $SERVICE_DIR/$COMPOSE_FILE"
  exit 1
fi

if [ ! -f "$SERVICE_DIR/scripts/apply-init-migrations.js" ]; then
  echo "Missing PostgreSQL init migration runner in $SERVICE_DIR/scripts"
  exit 1
fi

if [ ! -f "$SERVICE_DIR/scripts/uat-runtime-schema-sync.sql" ]; then
  echo "Missing runtime schema sync SQL in $SERVICE_DIR/scripts"
  exit 1
fi

cd "$SERVICE_DIR"

for ((attempt=1; attempt<=POSTGRES_READY_ATTEMPTS; attempt++)); do
  if docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE_NAME" sh -lc 'pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-vehicle_tracking}"' >/dev/null 2>&1; then
    break
  fi
  sleep "$POSTGRES_READY_INTERVAL_SECONDS"
done

if ! docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE_NAME" sh -lc 'pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-vehicle_tracking}"' >/dev/null 2>&1; then
  docker compose -f "$COMPOSE_FILE" logs --tail=100 "$POSTGRES_SERVICE_NAME" || true
  echo "PostgreSQL is not ready for schema sync"
  exit 1
fi

docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$SERVICE_DIR:/workspace:ro" \
  -w /workspace \
  "$POSTGRES_MIGRATION_NODE_IMAGE" \
  sh -lc 'apk add --no-cache docker-cli >/dev/null && node scripts/apply-init-migrations.js --mode docker'

docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE_NAME" sh -lc 'export PGPASSWORD="${POSTGRES_PASSWORD:-}"; psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-vehicle_tracking}"' < scripts/uat-runtime-schema-sync.sql
