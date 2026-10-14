#!/usr/bin/env bash
set -euo pipefail
# Source-initialized on new data volumes. Existing accounts are NOT rotated.
secret="${POSTGRES_BOOTSTRAP_ADMIN_PASSWORD:-}"
if [ "${#secret}" -lt 16 ] || [ "$secret" = 'CHANGE_ME_INITIAL_ADMIN_PASSWORD' ]; then
  echo >&2 'Refusing insecure admin bootstrap: set a unique password of >=16 characters.'
  exit 1
fi

# psql reads the secret through the environment, not process arguments or SQL
# files. pgcrypto creates a per-installation salted bcrypt hash.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
\getenv initial_admin_password POSTGRES_BOOTSTRAP_ADMIN_PASSWORD
INSERT INTO users (username, password_hash, full_name, role, device_access_mode, status, email)
VALUES ('admin', crypt(:'initial_admin_password', gen_salt('bf', 12)),
        'System Administrator', 'admin', 'all', 'active', 'admin@tracking.local')
ON CONFLICT (username) DO NOTHING;
SQL
