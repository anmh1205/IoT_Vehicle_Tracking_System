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

ENV_FILE="$SERVICE_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  umask 077
  : > "$ENV_FILE"
fi

if [ -n "${SERVICE_ENV_CONTENT:-}" ]; then
  while IFS= read -r line; do
    case "$line" in
      ''|'#'*) continue ;;
    esac

    key="${line%%=*}"
    if ! grep -q "^${key}=" "$ENV_FILE"; then
      printf '%s\n' "$line" >> "$ENV_FILE"
    fi
  done <<< "$SERVICE_ENV_CONTENT"
fi

if [ -f "$SERVICE_DIR/.env.example" ]; then
  while IFS= read -r line; do
    case "$line" in
      ''|'#'*) continue ;;
    esac

    key="${line%%=*}"
    if ! grep -q "^${key}=" "$ENV_FILE"; then
      printf '%s\n' "$line" >> "$ENV_FILE"
    fi
  done < "$SERVICE_DIR/.env.example"
fi

if [ ! -s "$ENV_FILE" ]; then
  echo "SERVICE_ENV_CONTENT is empty and no .env.example fallback found"
  exit 1
fi

if [ ! -f "$SERVICE_DIR/$COMPOSE_FILE" ]; then
  echo "Missing compose file: $SERVICE_DIR/$COMPOSE_FILE"
  exit 1
fi

cd "$SERVICE_DIR"
docker compose -f "$COMPOSE_FILE" config >/dev/null
