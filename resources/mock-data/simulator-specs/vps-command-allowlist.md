# VPS Command Allowlist for MQTT/VPS Fix Loop

## Principles
- Chỉ cho phép lệnh read-only và remediation tối thiểu.
- Cấm thao tác phá hủy dữ liệu/hạ tầng.
- Mọi lệnh ngoài danh sách này phải blocked + escalate human.

## Allowed Read-Only Commands
- `docker ps --format '{{.Names}}|{{.Status}}'`
- `docker logs --tail 120 tracking-mqtt-bridge`
- `docker logs --tail 120 tracking-backend`
- `curl -sS --max-time 5 http://127.0.0.1:4000/health`
- `curl -sS --max-time 5 http://127.0.0.1:4000/ws-health`
- `docker inspect --format '{{json .State.Health}}' tracking-backend`
- `docker inspect --format '{{json .State.Health}}' tracking-mqtt-bridge`
- `docker exec tracking-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'SELECT 1'`

## Allowed Minimal Fix Commands
- `docker restart tracking-mqtt-bridge`
- `docker restart tracking-backend`

## Explicitly Forbidden Commands
- `rm -rf *`
- `docker system prune -af`
- `docker compose down -v`
- `git reset --hard`
- `git clean -fd`
- `reboot`
- `shutdown`

## Constraints
- Timeout mặc định: 30s/lệnh; truy vấn log tối đa 90s.
- Mỗi run chỉ cho phép tối đa 1 targeted restart.
- Hard-stop override authority: Platform lead only.
