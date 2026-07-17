---
name: vps-control
description: Execute remote VPS SSH commands with isolated local .env loading and masked logs. Use for deploy, logs, restart, health-check operations from prompts.
license: MIT
version: 1.0.0
---

# VPS Control

## Overview

Execute remote VPS commands from prompts through local SSH binaries. Load credentials from local `.env` files and mask sensitive values in command output.

## When to Use

- Run ad-hoc remote commands: deploy check, service restart, log tail.
- Operate VPS from prompt without copying secrets into chat.
- Reuse a stable local env precedence across projects.

## Default Execution Mode

- Keep mode as **free-form no-confirm** (requested behavior).
- Accept remote command text directly via `--cmd` or positional args.
- Apply minimal guardrails: timeout + secret redaction in stdout/stderr.
- Default host verification is strict; use `--insecure` only when really needed.

## Default Auth Policy (Key-first)

- `VPS_FORCE_KEY_AUTH=true` is the default behavior.
- Skill auto-loads `VPS_KEY_PATH` from local `.env` and uses SSH key auth first.
- Password fallback is blocked by default even if `VPS_PASSWORD` exists.
- Password fallback is allowed only when explicitly setting:
  - `VPS_FORCE_KEY_AUTH=false`
  - `VPS_ALLOW_PASSWORD_FALLBACK=true`

## Setup

1. Create secret file: `~/.claude/skills/vps-control/.env`.
2. Copy keys from `.env.example` and fill real values locally.
3. Ensure SSH binary exists (`ssh`); install `sshpass` only when password automation is needed.

## Command Workflow

1. Build runtime env using `scripts/env-loader.js`.
2. Resolve target config (`VPS_HOST`, `VPS_USER`, auth fields).
3. Build SSH invocation via `scripts/run-remote-command.js`.
4. Execute command or show preview in `--dry-run` mode.
5. Redact sensitive output before printing.

## Run Examples

```bash
# Preview only (no execution)
node scripts/run-remote-command.js --cmd "systemctl status nginx" --dry-run

# Execute with env from ~/.claude/skills/vps-control/.env
node scripts/run-remote-command.js --cmd "docker ps"

# Override target inline
node scripts/run-remote-command.js --host 203.0.113.10 --user root --cmd "uname -a"
```

## Secret Isolation Rules

- Keep secret values only in local `.env` files; do not paste into prompt.
- Never print env values in logs.
- Prefer key auth (`VPS_KEY_PATH`).
- Password mode reads only `VPS_PASSWORD` from local `.env` (no inline `--password`).
- Windows: password mode is disabled; use key auth.

## References

- `references/vps-env-and-security.md` — env precedence, auth variables, isolation model.
- `references/vps-usage-workflow.md` — operation playbook and troubleshooting.
- `scripts/env-loader.js` — deterministic env merge order.
- `scripts/redact.js` — output masking utilities.
- `scripts/ssh-plan.js` — argument parsing + SSH execution plan.
- `scripts/run-remote-command.js` — CLI entrypoint.
- `scripts/*.test.js` — automated tests.
