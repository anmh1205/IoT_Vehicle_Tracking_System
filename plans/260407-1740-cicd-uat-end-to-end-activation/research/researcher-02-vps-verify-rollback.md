# Research Report: Docker Compose verify + rollback checklist (GitHub Actions -> SSH/SCP VPS)

- Timestamp: 2026-04-07 17:40:57 Asia/Saigon
- Scope: checklist vận hành sau deploy, thứ tự phụ thuộc service, rollback playbook, gate pass/fail
- Nguyên tắc: KISS, YAGNI, DRY; ưu tiên lệnh chạy được ngay

## 1) Kết luận ngắn (go/no-go tư duy)
- Compose **không có rollback built-in** như Swarm; rollback phải dựa vào **image tag pinning** + backup file compose/env.
- Gate deploy nên chia 4 lớp: (1) process/container, (2) health/readiness, (3) app/API smoke, (4) log/network/integrity.
- Nếu 1 gate critical fail quá timeout quy định -> **NO-GO + rollback ngay**.

## 2) Thứ tự phụ thuộc service (stack: postgres + emqx + backend + mqtt-bridge + frontend + grafana)
Khuyến nghị dependency graph:
1. postgres (ready bằng `pg_isready`)
2. emqx (broker up + API health khả dụng)
3. backend (cần postgres + emqx)
4. mqtt-bridge (cần emqx + backend)
5. frontend (cần backend API)
6. grafana (cần datasource backend/postgres theo cấu hình)

Compose pattern tối giản:
- Dùng `healthcheck` cho postgres/emqx/backend.
- Dùng `depends_on: condition: service_healthy` cho service downstream.
- Không lạm dụng `depends_on` cho mọi thứ; chỉ chặn startup khi thật sự cần.

## 3) Checklist verify sau deploy (command-level)
Giả sử trên VPS:
```bash
export APP_DIR=/opt/iot-stack
export COMPOSE_FILE=$APP_DIR/docker-compose.yml
export ENV_FILE=$APP_DIR/.env
cd "$APP_DIR"
```

### Gate A — Compose/env integrity (critical)
```bash
test -f "$COMPOSE_FILE" && test -f "$ENV_FILE"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config >/tmp/compose.rendered.yaml
```
Pass:
- exit code = 0, không lỗi biến env thiếu/sai format.
Fail -> NO-GO rollback.

### Gate B — Container/process status (critical)
```bash
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps --format json
```
Pass:
- Tất cả service expected ở trạng thái running (hoặc completed nếu one-shot).
Fail -> NO-GO rollback.

### Gate C — Health/readiness (critical)
```bash
# PostgreSQL (trong container)
docker compose exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"

# Backend health (đổi URL theo service)
curl -fsS http://127.0.0.1:8080/health

# Grafana health
curl -fsS http://127.0.0.1:3000/api/health

# EMQX: kiểm tra status container + endpoint API phù hợp cấu hình auth
# (nếu bật management API có auth/token, dùng curl kèm auth)
```
Pass:
- postgres `pg_isready` exit 0.
- backend/grafana trả HTTP 200 (hoặc contract hiện hành).
- emqx reachable theo cơ chế health đã cấu hình.
Fail -> NO-GO rollback.

### Gate D — Log sanity (critical trong 5-10 phút đầu)
```bash
docker compose logs --since=10m postgres emqx backend mqtt-bridge frontend grafana
```
Pass:
- Không có crash loop, migration lỗi, auth lỗi lặp, connection refused kéo dài.
Fail -> NO-GO rollback.

### Gate E — Network + dependency flow (important)
```bash
# Port listening trên host (tuỳ distro có ss)
ss -lntp | grep -E ':5432|:1883|:8080|:3000|:80|:443'

# DNS/service discovery nội bộ compose (ví dụ từ backend)
docker compose exec -T backend getent hosts postgres emqx
```
Pass:
- Port công khai đúng thiết kế; service name resolve được.
Fail -> đánh giá mức độ; critical path fail => NO-GO.

### Gate F — Image/tag drift check (critical)
```bash
docker compose images
# hoặc kiểm tra digest image đã pin/tag đúng kỳ vọng release
```
Pass:
- Tag/digest khớp release manifest.
Fail -> NO-GO rollback.

## 4) Pass/Fail criteria + Go/No-Go gates
- GO khi: A+B+C+F pass, D không lỗi nghiêm trọng, E không phá critical path.
- NO-GO khi 1 trong các điều kiện:
  - Compose render fail, env thiếu/sai.
  - Service core (postgres/emqx/backend) unhealthy > timeout (đề xuất 180s).
  - API health backend fail liên tục > 3 lần (interval 20s).
  - Log xuất hiện lỗi khởi động lặp/DB migration fail/auth fail không tự hồi phục.

## 5) Rollback playbook (image tag + compose/env)
Tiền đề nên có trước deploy:
```bash
# Trước khi update
cp "$COMPOSE_FILE" "$COMPOSE_FILE.bak.$(date +%Y%m%d%H%M%S)"
cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%Y%m%d%H%M%S)"
# Lưu release manifest: service -> tag/digest
```

### Rollback kiểu 1: image tag rollback (ưu tiên)
1. Đổi tag về phiên bản trước trong `.env` hoặc compose image fields.
2. Chạy:
```bash
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
```
3. Re-run toàn bộ Gate A..F.
4. Nếu pass -> GO (rollback thành công).

### Rollback kiểu 2: compose/env rollback (khi config drift)
1. Restore file backup gần nhất:
```bash
cp "$COMPOSE_FILE.bak.<timestamp>" "$COMPOSE_FILE"
cp "$ENV_FILE.bak.<timestamp>" "$ENV_FILE"
```
2. Apply lại stack:
```bash
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
```
3. Re-run Gate A..F.

### Rollback escalation (khi vẫn fail)
- Freeze release: không retry mù.
- Thu thập artifacts: `docker compose ps`, `docker compose logs --since=30m`, `docker inspect` service core.
- Mở incident + phân tích nguyên nhân gốc trước lần deploy kế tiếp.

## 6) Mẫu GitHub Actions SSH/SCP gate (logic tối giản)
- Bước deploy chỉ “thành công” khi script SSH trả exit code 0 sau khi chạy Gate A..F.
- Script nên `set -euo pipefail` để fail-fast.
- Tách rõ 2 job: `deploy` và `verify`; verify fail thì trigger job `rollback`.

## 7) Nguồn tham chiếu chính
- Docker Compose startup order / depends_on: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose services reference (depends_on, healthcheck): https://docs.docker.com/reference/compose-file/services/
- PostgreSQL `pg_isready`: https://www.postgresql.org/docs/15/app-pg-isready.html
- Grafana Health API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/other/
- EMQX API / deployment docs: https://docs.emqx.com/en/emqx/latest/admin/api.html
- EMQX availability check endpoint: https://docs.emqx.com/en/emqx/latest/deploy/cluster/rebalancing.html
- Compose deploy/rollback context (Swarm vs Compose): https://docs.docker.com/reference/compose-file/deploy/
- Docker Swarm rollback command (để phân biệt): https://docs.docker.com/reference/cli/docker/service/rollback/

## Unresolved questions
1. Health endpoint chuẩn của backend trong repo hiện tại là `/health`, `/healthz`, hay endpoint khác?
2. EMQX management API trên VPS có bật auth/token và whitelist IP chưa?
3. Timeout/go-no-go SLA chính thức cho UAT là bao nhiêu giây/phút cho từng service core?
4. Release manifest hiện đang pin theo tag hay digest (immutable)?