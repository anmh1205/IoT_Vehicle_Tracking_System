# Phase 03 - VPS deploy verification and observability gates

## 1) Context links
- Overview plan: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260407-1740-cicd-uat-end-to-end-activation/plan.md`
- Research 02: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260407-1740-cicd-uat-end-to-end-activation/research/researcher-02-vps-verify-rollback.md`
- VPS stack target: Traefik + Uptime Kuma đã có; app stack chưa chạy.

## 2) Overview
- Date: 2026-04-07
- Description: Xác thực deploy trên VPS bằng gates kỹ thuật, pass/fail rõ theo từng service.
- Priority: P1
- Implementation status: in-progress
- Review status: reviewed

## 3) Key Insights
- Compose không có rollback tự động như Swarm; verify phải fail-fast và rollback thủ công có kỷ luật.
- Gate cần đi từ integrity -> runtime -> health -> logs -> image drift.
- Không có pass từng service thì không được Go toàn hệ.

## 4) Requirements
- Functional:
  - Thực thi checklist SSH command-level sau mỗi deploy.
  - Đánh giá pass/fail cho từng service trong runtime chain.
  - Thiết lập Go/No-Go gate cuối phase.
- Non-functional:
  - Thời gian verify core service <= 180s/service (mốc khởi điểm).
  - Evidence đầy đủ: output `docker compose ps`, health, logs.

## 5) Architecture
- Verify layers:
  1) Compose/env integrity
  2) Container running
  3) Health/readiness
  4) Log sanity
  5) Image/tag drift
- Service order (fixed):
  `postgresql -> emqx -> backend -> mqtt-bridge -> frontend -> grafana`
- Mobile: không thuộc runtime gate chain.

## 6) Related code files
- Modify (expected):
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/*-uat.yml` (thêm bước verify/fail-fast nếu thiếu)
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/**/docker-compose.yml` (nếu cần bổ sung healthcheck)
- Create: none.
- Delete: none.

## 7) Implementation Steps
1. SSH vào VPS và chuẩn hóa biến:
   - `ssh <user>@<vps-ip>`
   - `export APP_DIR=/opt/iot-stack`
   - `export COMPOSE_FILE=$APP_DIR/docker-compose.yml`
   - `export ENV_FILE=$APP_DIR/.env`
2. Gate A - integrity (critical):
   - `test -f "$COMPOSE_FILE" && test -f "$ENV_FILE"`
   - `docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config >/tmp/compose.rendered.yaml`
3. Gate B - container status (critical):
   - `docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps`
4. Gate C - health/readiness (critical):
   - `docker compose exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"`
   - `curl -fsS http://127.0.0.1:8080/health`
   - `curl -fsS -u "$EMQX_ADMIN_USER:$EMQX_ADMIN_PASSWORD" http://127.0.0.1:18083/status`
   - <!-- Updated: Validation Session 1 - backend/emqx gate -->
   - Backend canonical gate endpoint: `/health`.
   - EMQX readiness gate: HTTP health endpoint + auth (không dùng running-state đơn lẻ).
5. Gate D - log sanity (critical):
   - `docker compose logs --since=10m postgres emqx backend mqtt-bridge frontend grafana`
   - `deploy-service.sh` đã tail log khi fail, kèm consecutive success gate và attempts/interval/timeout config để giảm false-green và dễ chẩn đoán.
6. Gate E/F - network + image drift (critical if mismatch):
   - `ss -lntp | grep -E ':5432|:1883|:8080|:3000|:80|:443'`
   - `docker compose images`

## 8) Todo List
- [ ] Chạy đủ Gate A..F sau deploy.
- [ ] Ghi pass/fail cho từng service.
- [ ] Chặn sang phase 04 nếu service core chưa pass.
- [ ] Lưu artifacts/log bằng workflow artifact hoặc run summary.

## 9) Success Criteria
### Service pass/fail matrix
- **postgresql**: PASS khi `pg_isready` exit 0 trong 180s; FAIL nếu timeout/error.
- **emqx**: PASS khi container running + endpoint quản trị/health reachable; FAIL nếu crash/unreachable.
- **backend**: PASS khi `/health` HTTP 200 ổn định 3 lần liên tiếp; FAIL nếu non-200/connection refused.
- **mqtt-bridge**: PASS khi container running + log không có reconnect/error loop > 3 phút; FAIL nếu loop.
- **frontend**: PASS khi HTTP 200 từ endpoint web + reverse proxy route hoạt động; FAIL nếu 5xx/unreachable.
- **grafana**: PASS khi `/api/health` HTTP 200 + login page reachable; FAIL nếu không lên.

### Go/No-Go gate
- **GO**: tất cả service trong matrix PASS.
- **NO-GO**: bất kỳ service core (`postgresql`, `emqx`, `backend`) FAIL hoặc image drift sai release manifest.

## 10) Risk Assessment
- Risk: false positive do check 1 lần.
  - Mitigation: yêu cầu 3 lần liên tiếp cho health backend.
- Risk: drift image tag ngoài kế hoạch.
  - Mitigation: bắt buộc `docker compose images` đối chiếu manifest.

## 11) Security Considerations
- SSH dùng key-based auth, tắt password auth nếu có thể.
- Không in secret env vào log CI.
- Quản lý quyền user deploy trên VPS theo least privilege.

## 12) Next Steps
- Sang Phase 04 để drill rollback image/config và ra quyết định Go/No-Go phát hành UAT.
