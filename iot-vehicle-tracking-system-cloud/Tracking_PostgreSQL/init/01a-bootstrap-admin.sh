#!/usr/bin/env bash
set -euo pipefail

# Docker entrypoint executes this only while initializing a new data directory.
secret="${POSTGRES_BOOTSTRAP_ADMIN_PASSWORD:-}"
if [ "${#secret}" -lt 16 ] || [ "$secret" = 'CHANGE_ME_INITIAL_ADMIN_PASSWORD' ] || [ "$secret" = 'Admin@2026' ]; then
  echo >&2 'Refusing admin bootstrap: set an installation-unique initial password (>= 16 characters).'
  exit 1
fi

# No password in shell argv or SQL files. CREATE EXTENSION is deliberately here
# instead of mutating previously-applied 00-extensions.sql migration checksums.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
\getenv initial_admin_password POSTGRES_BOOTSTRAP_ADMIN_PASSWORD
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
INSERT INTO users (username, password_hash, full_name, role, device_access_mode, status, email)
VALUES ('admin', crypt(:'initial_admin_password', gen_salt('bf', 12)),
        'System Administrator', 'admin', 'all', 'active', 'admin@tracking.local')
ON CONFLICT (username) DO NOTHING;
COMMIT;
SQL
