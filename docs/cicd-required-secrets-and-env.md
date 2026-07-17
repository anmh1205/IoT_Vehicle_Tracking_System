# CI/CD Required Secrets and Env (UAT minimal)

## Scope
Tài liệu này áp dụng cho luồng deploy tối giản kiểu IVM26:
1) Build/push image trên GitHub Actions.
2) SSH bootstrap VPS lần đầu.
3) Auto deploy khi `push` nhánh `uat` hoặc chạy manual `workflow_dispatch`.
4) Các workflow UAT dùng `concurrency` để tránh chồng deploy cùng môi trường.

## Repository Secrets bắt buộc

### Shared deploy secrets (dùng cho cả Backend/Frontend/MQTT Bridge)
- `SSH_DEPLOY_IP`
- `SSH_DEPLOY_PORT`
- `SSH_DEPLOY_USER`
- `SSH_PRIVATE_KEY`
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `DISCORD_WEBHOOK_URL`

### NPM UAT proxy/SSL bootstrap secrets
- `NPM_ADMIN_EMAIL` (optional)
- `NPM_ADMIN_PASSWORD` (optional)

> Nếu thiếu một trong hai secret trên, workflow vẫn deploy container NPM nhưng **skip** bước bootstrap proxy/SSL bằng NPM API.

### Service runtime env payload secrets (multiline)
- `BACKEND_UAT_ENV_FILE`
- `FRONTEND_UAT_ENV_FILE`
- `MQTT_BRIDGE_UAT_ENV_FILE`
- `POSTGRESQL_UAT_ENV_FILE` (optional, fallback `BACKEND_UAT_ENV_FILE`)
- `EMQX_UAT_ENV_FILE` (optional, fallback `BACKEND_UAT_ENV_FILE`)
- `GRAFANA_UAT_ENV_FILE` (optional, fallback `BACKEND_UAT_ENV_FILE`)

## Frontend build-time public config secrets
- `NEXT_PUBLIC_API_BASE_URL` (legacy compatibility)
- `NEXT_PUBLIC_API_URL` (preferred, consumed by frontend rewrite)
- `NEXT_PUBLIC_WS_URL`
- `NEXT_PUBLIC_WS_PATH`
- `NEXT_PUBLIC_MQTT_HOST`
- `NEXT_PUBLIC_MQTT_WS_PORT`

## Mapping chính
- `.github/workflows/backend-uat.yml`
  - Build image: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`
  - Image tags: `tracking-backend:uat` và `tracking-backend:uat-${github.sha}`
  - Deploy: shared deploy secrets + `BACKEND_UAT_ENV_FILE`
- `.github/workflows/frontend-uat.yml`
  - Build image: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, frontend build-time public config secrets
  - Deploy: shared deploy secrets + `FRONTEND_UAT_ENV_FILE`
- `.github/workflows/mqtt-bridge-uat.yml`
  - Build image: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`
  - Deploy: shared deploy secrets + `MQTT_BRIDGE_UAT_ENV_FILE`
- `.github/workflows/npm-uat.yml`
  - Deploy NPM container: shared deploy secrets
  - Bootstrap proxy + SSL via NPM API: `NPM_ADMIN_EMAIL`, `NPM_ADMIN_PASSWORD`
  - Auto reconcile target routes:
    - `thingdock.dev` → `tracking-frontend:4001`
    - `be.thingdock.dev` → `tracking-backend:4000`
    - `mqtt.thingdock.dev` (WSS, path `/mqtt`) → `tracking-emqx:8083`
    - `mqtt.thingdock.dev` (MQTTS, TCP stream passthrough) → `tracking-emqx:8883`

## Runtime behavior notes
- `bootstrap-vps.sh` chỉ tạo `$SERVICE_DIR/.env` khi file chưa tồn tại; khi file đã tồn tại, script sẽ **reconcile** `SERVICE_ENV_CONTENT` theo cơ chế upsert (key đã có sẽ được cập nhật), đồng thời backup file cũ thành `.env.bak`.
- `deploy-service.sh` chạy healthcheck theo service nếu có URL; backend hiện dùng `http://localhost:4000/health` với ngưỡng `3` lần thành công liên tiếp, `HEALTHCHECK_MAX_ATTEMPTS=40`, và `HEALTHCHECK_INTERVAL_SECONDS=3`.
- Khi healthcheck không đạt, script in log tail của service rồi fail để giữ deploy ngắn và rõ nguyên nhân.
- Discord notification dùng pattern an toàn `if: always()` + `continue-on-error: true`, nên bước báo trạng thái không làm hỏng kết quả deploy chính.
- Lưu ý networking: `NEXT_PUBLIC_*` là build-time public config cho frontend (browser-facing), còn các biến như `MQTT_HOST` trong backend/mqtt-bridge là internal Docker networking (ví dụ `tracking-emqx`).

## Preflight checklist trước khi bật auto deploy
- [ ] Đã tạo đầy đủ secrets ở mức repository.
- [ ] `SSH_DEPLOY_USER` có quyền ghi vào `/opt/tracking`.
- [ ] VPS có `docker` và `docker compose` plugin.
- [ ] Trên VPS đã có network `tracking-network`.
- [ ] `*_UAT_ENV_FILE` đúng format `.env` (mỗi dòng `KEY=VALUE`, không có dấu nháy thừa).
- [ ] Đã verify backend health endpoint `http://localhost:4000/health` trên VPS.
- [ ] Đã verify frontend URL `http://localhost:4001` trên VPS.
