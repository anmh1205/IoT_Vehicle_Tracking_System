# Secure PostgreSQL administrator bootstrap and upgrade

PostgreSQL listens on `127.0.0.1:5432` on the host by default; containers on `tracking-network` can still connect. External access requires an explicit `POSTGRES_BIND_ADDRESS` setting and a protected maintenance network.

## New data volumes

Set unique `POSTGRES_PASSWORD` and `POSTGRES_BOOTSTRAP_ADMIN_PASSWORD` values in the deployment's protected environment source **before** running Compose. The bootstrap password must contain at least 16 characters and must not be the public template string. Store it in a secret manager, not in Git. The Docker init sequence creates the `admin` account with a per-installation salted bcrypt hash; no shared password is in `01-users.sql`.

The `POSTGRES_BOOTSTRAP_ADMIN_PASSWORD` environment variable is intentionally required by Compose even for existing data volumes. Once a PostgreSQL data directory is initialized, its existing users are **not** changed by the bootstrap script.

## Existing data volumes

Take and verify a backup before upgrading. If an installation still uses the public default administrator hash, rotate it before synchronizing the new init migrations. From the host containing `Tracking_PostgreSQL`, with Docker running and a sufficiently privileged maintenance session:

```bash
read -rsp 'New administrator password: ' POSTGRES_BOOTSTRAP_ADMIN_PASSWORD
echo
export POSTGRES_BOOTSTRAP_ADMIN_PASSWORD
docker exec -i -e POSTGRES_BOOTSTRAP_ADMIN_PASSWORD tracking-postgres bash -s < scripts/rotate-legacy-admin.sh
unset POSTGRES_BOOTSTRAP_ADMIN_PASSWORD
```

This script updates **only** the known legacy `admin` hash, creates a salted replacement and invalidates that user's database-backed sessions. It does not reset an already rotated/customized administrator password. A successful command that changes zero rows is therefore not evidence that an account was rotated. Confirm the intended administrator can log in using the new credential and that the public previous credential is rejected.

The migration runner recognizes **exactly one** old/new SHA-256 pair for `01-users.sql`, representing removal of the historical password seed. It refuses every other checksum drift. It also refuses this allowed reconciliation, including on databases without receipts, while the old seed hash is active. Do not bypass that check by editing the migration-tracking table manually. Apply future schema changes as new migration files.

Configure `POSTGRES_BOOTSTRAP_ADMIN_PASSWORD` in the deployment's private environment source even if all existing users have custom passwords. UAT deployment will fail before touching the remote host if the secret is missing or is the public placeholder. Verify authentication, assigned-device authorization, SQL schema migration logs and PostgreSQL health after deployment.

## Boundaries

Passing a fresh-volume CI test does not establish that an existing production volume has been upgraded or that its old sessions were invalidated. Verify the target database and credentials separately before authorizing a UAT or production rollout. Never expose a PostgreSQL port on the public internet for routine maintenance; prefer a VPN or SSH tunnel.
