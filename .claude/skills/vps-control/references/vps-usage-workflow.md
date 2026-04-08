# VPS usage workflow

## Quick run

```bash
node scripts/run-remote-command.js --cmd "docker ps"
```

## Dry-run preview

```bash
node scripts/run-remote-command.js --cmd "systemctl status nginx" --dry-run
```

## Insecure mode (opt-in)

```bash
node scripts/run-remote-command.js --cmd "uptime" --insecure
```

## Override host/user on demand

```bash
node scripts/run-remote-command.js --host 203.0.113.10 --user root --cmd "uname -a"
```

## Password mode (explicit opt-in only)

- Default flow is key-first: set `VPS_KEY_PATH` and keep `VPS_FORCE_KEY_AUTH=true` (default).
- Set `VPS_PASSWORD` in local `.env` (không truyền `--password`).
- To allow password fallback intentionally, set both:
  - `VPS_FORCE_KEY_AUTH=false`
  - `VPS_ALLOW_PASSWORD_FALLBACK=true`
- Linux/macOS: ensure `sshpass` exists in local system.
- Windows: password mode không hỗ trợ, dùng `VPS_KEY_PATH`.

## Troubleshooting

- `Missing ssh binary`:
  - install OpenSSH client.
- `Password mode requires sshpass`:
  - install `sshpass` or use key auth.
- `Missing VPS_HOST / VPS_USER`:
  - set env values or pass flags.
- timeout/signal killed:
  - increase `VPS_TIMEOUT_MS`.

## Operational safety notes

- Free-form mode runs exact command text.
- Prefer running read-only checks before restart/mutation commands.
- Keep logs and deploy scripts deterministic for repeatability.
