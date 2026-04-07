#!/usr/bin/env bash
set -euo pipefail

SERVICE_DIR="${1:-}"
COMPOSE_FILE="${2:-docker-compose.uat.yml}"

if [ -z "$SERVICE_DIR" ]; then
  echo "Usage: bootstrap-vps.sh <service_dir> [compose_file]"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required on VPS"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  :
else
  echo "docker compose plugin is required on VPS"
  exit 1
fi

mkdir -p "$SERVICE_DIR"

if [ ! -f "$SERVICE_DIR/.env" ]; then
  umask 077
  : > "$SERVICE_DIR/.env"

  if [ -n "${SERVICE_ENV_CONTENT:-}" ]; then
    printf '%s\n' "$SERVICE_ENV_CONTENT" > "$SERVICE_DIR/.env"
  fi

  if [ -f "$SERVICE_DIR/.env.example" ]; then
    while IFS= read -r line; do
      case "$line" in
        ''|'#'*) continue ;;
      esac

      key="${line%%=*}"
      if ! grep -q "^${key}=" "$SERVICE_DIR/.env"; then
        printf '%s\n' "$line" >> "$SERVICE_DIR/.env"
      fi
    done < "$SERVICE_DIR/.env.example"
  fi

  if [ ! -s "$SERVICE_DIR/.env" ]; then
    echo "SERVICE_ENV_CONTENT is empty and no .env.example fallback found"
    exit 1
  fi
fi

if [ ! -f "$SERVICE_DIR/$COMPOSE_FILE" ]; then
  echo "Missing compose file: $SERVICE_DIR/$COMPOSE_FILE"
  exit 1
fi

cd "$SERVICE_DIR"
docker compose -f "$COMPOSE_FILE" config >/dev/null
