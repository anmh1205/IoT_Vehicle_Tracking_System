#!/usr/bin/env bash
set -euo pipefail

# Operator-run remediation for databases initialized by the former public
# default-admin seed. Never reset an administrator whose password has changed.
secret="${POSTGRES_BOOTSTRAP_ADMIN_PASSWORD:-}"
if [ "${#secret}" -lt 16 ] || [ "$secret" = 'CHANGE_ME_INITIAL_ADMIN_PASSWORD' ] || [ "$secret" = 'Admin@2026' ]; then
  echo >&2 'Refusing legacy admin rotation: a unique password >=16 characters is required.'
  exit 1
fi

psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-vehicle_tracking}" <<'SQL'
\getenv replacement_password POSTGRES_BOOTSTRAP_ADMIN_PASSWORD
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
WITH rotated AS (
  UPDATE users
  SET password_hash = crypt(:'replacement_password', gen_salt('bf', 12)),
      updated_at = NOW()
  WHERE username = 'admin'
    AND password_hash = '$2a$12$iZP02NlhuT/z5W8U7Q7eHOfydGsNPt1tnJFIIR5YGPpgyBmQaKrci'
  RETURNING id
)
UPDATE user_sessions
SET is_active = FALSE
WHERE user_id IN (SELECT id FROM rotated);
COMMIT;
SQL
