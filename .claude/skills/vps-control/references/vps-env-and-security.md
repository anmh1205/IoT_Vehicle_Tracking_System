# VPS env + security reference

## Env precedence (high -> low)

1. `process.env`
2. `$HOME/.claude/skills/vps-control/.env`
3. `$HOME/.claude/skills/.env`
4. `$HOME/.claude/.env`
5. `./.claude/skills/vps-control/.env`
6. `./.claude/skills/.env`
7. `./.claude/.env`

Implementation merges low -> high, then overlays `process.env`.

## Required variables

- `VPS_HOST`: remote host/IP.
- `VPS_USER`: ssh user.

## Optional variables

- `VPS_PORT` (default `22`)
- `VPS_KEY_PATH` (preferred auth)
- `VPS_TIMEOUT_MS` (default `45000`)
- `VPS_STRICT_HOST_KEY_CHECKING` (`true/false`, default `true`)
- `VPS_FORCE_KEY_AUTH` (`true/false`, default `true`)
- `VPS_PASSWORD` (fallback auth, only when key force disabled)
- `VPS_ALLOW_PASSWORD_FALLBACK` (`true/false`, default `false`)

## Isolation model

- Keep secrets in local `.env` only.
- Do not paste secrets into prompts.
- Do not commit `.env` into git.
- Runtime output is redacted for secret-like env values.

## Redaction scope

Mask values from keys matching:
- `PASSWORD`, `PASS`, `TOKEN`, `SECRET`, `PRIVATE_KEY`, `API_KEY`, `ACCESS_KEY`
- `AUTHORIZATION`, `COOKIE`, `SESSION`, `JWT`, `BEARER`, `CREDENTIAL`

Ignore path-like keys (`*_PATH`) to avoid over-masking.
