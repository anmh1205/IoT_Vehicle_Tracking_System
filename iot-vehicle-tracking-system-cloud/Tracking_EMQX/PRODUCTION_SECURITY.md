# SV-06: EMQX 5.8+ MQTT client authentication & topic isolation

The legacy `EMQX_ALLOW_ANONYMOUS=false` variable in docker-compose must **not** be treated as a complete EMQX v5 authorization control. EMQX v5 requires an actual authenticator and authorization sources. Run `node scripts/provision-access.mjs` to preview the exact rules; pass `--apply` after reviewing the dashboard configuration.

## Required inputs

Set `IVTS_EMQX_API_URL=https://<broker-admin-host>/api/v5` (HTTP accepted only for `127.0.0.1` / `localhost` tunnel), `IVTS_EMQX_ADMIN_USERNAME`, `IVTS_EMQX_ADMIN_PASSWORD`, `IVTS_MQTT_ROLE` (`device`, `bridge`, or `backend`), `IVTS_MQTT_USERNAME`, `IVTS_MQTT_PASSWORD` (16+ chars); for device also `IVTS_MQTT_DEVICE_ID`. Unique usernames/passwords **per client**; for bridge/backend use the matching application's MQTT username/password. Never commit .env secrets or echo them in CI.

The script configures an enabled password-based built-in database authenticator, explicitly blocks active **other** authentication/authorization sources (including default permissive file rules), turns on default-deny without cache, provisions a non-superuser MQTT credential, and applies least-privilege **username** ACL rules (not spoofable client-id-only rules). Existing identities are NOT silently rotated; if an existing username is found, verify the associated password separately or rotate through EMQX dashboard/API. It refuses active extra authorizers instead of deleting them in production.

Before applying, back up `emqx-data` and manually audit/remove broad/default rules in EMQX Access Control; temporarily isolate the broker. Provision bridge/backend users, then individual devices, then verify allowed own-topic publish and denied cross-device subscribe/publish. The existing CI integration checks an actual EMQX ACL SUBACK deny/recover path; the script itself has isolated unit tests. **Do not claim production ACL is fixed until the deployment run and attacker-client acceptance checks pass.**

## Disable plaintext after TLS migration

The firmware, MQTT Bridge and Backend must all successfully negotiate TLS with a broker certificate chain trusted on each client. Provision CA, server cert/key, and set Bridge `MQTT_USE_TLS`/CA settings **before** disabling ports 1883/8083. Then disable EMQX TCP/WS plaintext listeners in the broker's persisted config and verify only TLS/WSS is reachable; remove any Docker or reverse proxy host mappings for 1883/8083. Don't blindly disable live plaintext listeners before firmware is upgraded — that would strand devices. Protect dashboard port 18083 behind localhost, firewall or authenticated HTTPS reverse proxy.

Official EMQX references: https://docs.emqx.com/en/emqx/latest/guides/access-control/authn/mnesia.html and https://docs.emqx.com/en/emqx/latest/guides/access-control/authz/mnesia.html
