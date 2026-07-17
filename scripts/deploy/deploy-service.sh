#!/usr/bin/env bash
set -euo pipefail

SERVICE_DIR="${1:-}"
COMPOSE_FILE="${2:-docker-compose.uat.yml}"
SERVICE_NAME="${3:-}"
HEALTHCHECK_URL="${4:-}"
HEALTHCHECK_REQUIRED_SUCCESSES="${5:-1}"
HEALTHCHECK_MAX_ATTEMPTS="${HEALTHCHECK_MAX_ATTEMPTS:-40}"
HEALTHCHECK_INTERVAL_SECONDS="${HEALTHCHECK_INTERVAL_SECONDS:-3}"

if [ -z "$SERVICE_DIR" ] || [ -z "$SERVICE_NAME" ]; then
  echo "Usage: deploy-service.sh <service_dir> [compose_file] <service_name> [healthcheck_url] [required_successes]"
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

  if ! [[ "$HEALTHCHECK_REQUIRED_SUCCESSES" =~ ^[0-9]+$ ]] || [ "$HEALTHCHECK_REQUIRED_SUCCESSES" -lt 1 ]; then
    echo "required_successes must be an integer >= 1"
    exit 1
  fi

  if ! [[ "$HEALTHCHECK_MAX_ATTEMPTS" =~ ^[0-9]+$ ]] || [ "$HEALTHCHECK_MAX_ATTEMPTS" -lt 1 ]; then
    echo "HEALTHCHECK_MAX_ATTEMPTS must be an integer >= 1"
    exit 1
  fi

  if ! [[ "$HEALTHCHECK_INTERVAL_SECONDS" =~ ^[0-9]+$ ]] || [ "$HEALTHCHECK_INTERVAL_SECONDS" -lt 1 ]; then
    echo "HEALTHCHECK_INTERVAL_SECONDS must be an integer >= 1"
    exit 1
  fi

  consecutive_successes=0

  for ((attempt=1; attempt<=HEALTHCHECK_MAX_ATTEMPTS; attempt++)); do
    if curl --connect-timeout 2 --max-time 5 -fsS "$HEALTHCHECK_URL" >/dev/null; then
      consecutive_successes=$((consecutive_successes + 1))
      if [ "$consecutive_successes" -ge "$HEALTHCHECK_REQUIRED_SUCCESSES" ]; then
        exit 0
      fi
    else
      consecutive_successes=0
    fi
    sleep "$HEALTHCHECK_INTERVAL_SECONDS"
  done

  docker compose -f "$COMPOSE_FILE" logs --tail=100 "$SERVICE_NAME" || true
  echo "Healthcheck failed: $HEALTHCHECK_URL (required_successes=$HEALTHCHECK_REQUIRED_SUCCESSES, max_attempts=$HEALTHCHECK_MAX_ATTEMPTS, interval_s=$HEALTHCHECK_INTERVAL_SECONDS)"
  exit 1
fi
