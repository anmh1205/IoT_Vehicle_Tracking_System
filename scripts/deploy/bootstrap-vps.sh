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

apply_env_block() {
  local env_content="${1:-}"
  if [ -z "$env_content" ]; then
    return 0
  fi

  cp "$ENV_FILE" "$ENV_FILE.bak"

  managed_keys_file="$(mktemp)"
  managed_lines_file="$(mktemp)"
  env_preserved_file="$(mktemp)"

  while IFS= read -r line; do
    case "$line" in
      ''|'#'*) continue ;;
      *=*) ;;
      *) continue ;;
    esac

    key="${line%%=*}"
    printf '%s\n' "$key" >> "$managed_keys_file"
    printf '%s\n' "$line" >> "$managed_lines_file"
  done <<< "$SERVICE_ENV_CONTENT"

  if [ -s "$managed_keys_file" ]; then
    awk -F= 'NR==FNR {keys[$0]=1; next} {
      line=$0
      if (line ~ /^[[:space:]]*#/ || line !~ /=/) { print line; next }
      key=$1
      sub(/^[[:space:]]+/, "", key)
      sub(/[[:space:]]+$/, "", key)
      if (!(key in keys)) print line
    }' "$managed_keys_file" "$ENV_FILE" > "$env_preserved_file"

    cat "$env_preserved_file" "$managed_lines_file" > "$ENV_FILE"
  fi

  rm -f "$managed_keys_file" "$managed_lines_file" "$env_preserved_file"
}

apply_env_block "${SERVICE_ENV_CONTENT:-}"
apply_env_block "${SERVICE_ENV_OVERRIDES:-}"

if [ -n "${SERVICE_ENV_CONTENT:-}" ] || [ -n "${SERVICE_ENV_OVERRIDES:-}" ]; then
  :
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
