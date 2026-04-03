# CI/CD Required Secrets and Env (UAT minimal)

## Scope
Tài liệu này áp dụng cho luồng deploy tối giản kiểu IVM26:
1) Build/push image trên GitHub Actions.
2) SSH bootstrap VPS lần đầu.
3) Auto deploy khi `push` nhánh `uat` hoặc chạy manual `workflow_dispatch`.

## Repository Secrets bắt buộc

### Shared deploy secrets (dùng cho cả Backend/Frontend/MQTT Bridge)
- `SSH_DEPLOY_IP`
- `SSH_DEPLOY_PORT`
- `SSH_DEPLOY_USER`
- `SSH_PRIVATE_KEY`
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `DISCORD_WEBHOOK_URL`

### Service runtime env payload secrets (multiline)
- `BACKEND_UAT_ENV_FILE`
- `FRONTEND_UAT_ENV_FILE`
- `MQTT_BRIDGE_UAT_ENV_FILE`

## Frontend build-time public config secrets
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_WS_URL`
- `NEXT_PUBLIC_WS_PATH`
- `NEXT_PUBLIC_MQTT_HOST`
- `NEXT_PUBLIC_MQTT_WS_PORT`

## Mapping chính
- `.github/workflows/backend-uat.yml`
  - Build image: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`
  - Deploy: shared deploy secrets + `BACKEND_UAT_ENV_FILE`
- `.github/workflows/frontend-uat.yml`
  - Build image: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, frontend build-time public config secrets
  - Deploy: shared deploy secrets + `FRONTEND_UAT_ENV_FILE`
- `.github/workflows/mqtt-bridge-uat.yml`
  - Build image: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`
  - Deploy: shared deploy secrets + `MQTT_BRIDGE_UAT_ENV_FILE`

## Runtime behavior notes
- `bootstrap-vps.sh` chỉ tạo `$SERVICE_DIR/.env` khi file chưa tồn tại, dữ liệu lấy từ secret `*_UAT_ENV_FILE` tương ứng.
- `deploy-service.sh` chạy healthcheck theo service nếu có URL; hiện tại frontend dùng `http://localhost:4001`, backend dùng `http://localhost:4000/health`.

## Preflight checklist trước khi bật auto deploy
- [ ] Đã tạo đầy đủ secrets ở mức repository.
- [ ] `SSH_DEPLOY_USER` có quyền ghi vào `/opt/tracking`.
- [ ] VPS có `docker` và `docker compose` plugin.
- [ ] Trên VPS đã có network `tracking-network`.
- [ ] `*_UAT_ENV_FILE` đúng format `.env` (mỗi dòng `KEY=VALUE`, không có dấu nháy thừa).
- [ ] Đã verify backend health endpoint `http://localhost:4000/health` trên VPS.
- [ ] Đã verify frontend URL `http://localhost:4001` trên VPS.
