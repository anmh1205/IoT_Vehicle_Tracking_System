#!/usr/bin/env bash
set -euo pipefail

SERVICE_DIR="${1:-}"
COMPOSE_FILE="${2:-docker-compose.uat.yml}"
SERVICE_NAME="${3:-}"
HEALTHCHECK_URL="${4:-}"

if [ -z "$SERVICE_DIR" ] || [ -z "$SERVICE_NAME" ]; then
  echo "Usage: deploy-service.sh <service_dir> [compose_file] <service_name> [healthcheck_url]"
  exit 1
fi

cd "$SERVICE_DIR"

docker compose -f "$COMPOSE_FILE" pull "$SERVICE_NAME"
docker compose -f "$COMPOSE_FILE" up -d "$SERVICE_NAME"

docker compose -f "$COMPOSE_FILE" ps "$SERVICE_NAME"

if [ -n "$HEALTHCHECK_URL" ]; then
  if ! command -v curl >/dev/null 2>&1; then
    echo "curl is required for healthcheck"
    exit 1
  fi

  for _ in {1..20}; do
    if curl -fsS "$HEALTHCHECK_URL" >/dev/null; then
      exit 0
    fi
    sleep 3
  done

  echo "Healthcheck failed: $HEALTHCHECK_URL"
  exit 1
fi
