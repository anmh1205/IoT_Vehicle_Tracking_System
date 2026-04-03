---
title: "IVM26 CI/CD tối giản: secrets + VPS bootstrap + auto deploy"
description: "Chốt đúng scope IVM26 cho 3 workflow UAT: chuẩn hóa secret names, bootstrap VPS idempotent qua SSH, auto deploy push uat kèm manual fallback."
status: pending
priority: P1
effort: 3h
branch: feature/cicd
tags: [cicd, github-actions, vps, ssh, ivm26]
created: 2026-04-03
---

# Scope lock (không mở rộng)
- Chỉ 3 service runtime: Backend, Frontend, MQTT Bridge.
- Không đụng rollout nâng cao/rollback phức tạp.
- Không đổi kiến trúc deploy hiện tại ngoài bootstrap idempotent + trigger fallback.

# (a) Danh sách file cần sửa/tạo
## Sửa
1. `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/backend-uat.yml`
2. `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/frontend-uat.yml`
3. `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/mqtt-bridge-uat.yml`

## Tạo
4. `E:/anmh1205/IoT_Vehicle_Tracking_System/scripts/deploy/bootstrap-vps.sh`
5. `E:/anmh1205/IoT_Vehicle_Tracking_System/scripts/deploy/deploy-service.sh`
6. `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/cicd-required-secrets-and-env.md`

# (b) Thay đổi cụ thể từng file (mức step/job)
## 1) backend-uat.yml
- `on`: thêm `workflow_dispatch` (manual fallback), giữ `push uat` + path filter.
- `deploy-uat` job:
  - thêm preflight step kiểm tra biến bắt buộc (fail-fast).
  - bỏ SSH inline script dài; gọi `bootstrap-vps.sh` + `deploy-service.sh backend`.
  - truyền env chuẩn hóa (service name, deploy path `/opt/tracking/Tracking_Backend`, image tag `uat`).

## 2) frontend-uat.yml
- `on`: thêm `workflow_dispatch`, giữ `push uat` + path filter.
- `quality-and-build`: giữ build args hiện tại, chỉ chuẩn hóa tên key theo checklist docs.
- `deploy-uat` job:
  - preflight secret check.
  - gọi `bootstrap-vps.sh` + `deploy-service.sh frontend`.
  - giữ deploy path `/opt/tracking/Tracking_Frontend`.

## 3) mqtt-bridge-uat.yml
- `on`: thêm `workflow_dispatch`, giữ `push uat` + path filter.
- `deploy-uat` job:
  - preflight secret check.
  - gọi `bootstrap-vps.sh` + `deploy-service.sh mqtt-bridge`.
  - giữ deploy path `/opt/tracking/Tracking_MqttBridge`.

## 4) bootstrap-vps.sh (mới)
- Idempotent bootstrap đầu-cuối:
  1) tạo/check thư mục `/opt/tracking/*` + permission an toàn.
  2) đảm bảo Docker/Compose callable (fail rõ nếu thiếu).
  3) tạo `.env` nếu chưa có từ input secrets mapping; nếu có thì không overwrite bừa.
  4) verify file compose tồn tại trước deploy.
- Không log secret value.

## 5) deploy-service.sh (mới)
- Nhận tham số service/path/compose file/tag.
- Chạy `docker compose pull` + `docker compose up -d`.
- Healthcheck tối thiểu theo service:
  - backend: `/health`.
  - frontend: HTTP 200 trang chủ.
  - mqtt-bridge: container running + recent logs không crash loop.

## 6) cicd-required-secrets-and-env.md (mới)
- Checklist key names bắt buộc (không chứa value):
  - chung: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `SSH_DEPLOY_IP`, `SSH_DEPLOY_PORT`, `SSH_DEPLOY_USER`, `SSH_PRIVATE_KEY`, `DISCORD_WEBHOOK_URL`.
  - frontend build args: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_WS_PATH`, `NEXT_PUBLIC_MQTT_HOST`, `NEXT_PUBLIC_MQTT_WS_PORT`.
- Mapping key -> workflow -> step sử dụng.
- Runbook ngắn: verify secrets trước lần deploy đầu.

# (c) Rủi ro chính + cách giảm
1. Sai/thiếu secret name -> job fail giữa chừng.
   - Giảm: preflight check đầu job + docs checklist 1 nguồn sự thật.
2. Bootstrap ghi đè `.env` gây lỗi runtime.
   - Giảm: chỉ tạo khi chưa tồn tại; nếu đã có thì validate key required, không overwrite default.
3. SSH user quyền quá lớn.
   - Giảm: giới hạn user deploy vào `/opt/tracking`, không sudo tràn lan trong script.
4. Manual fallback không đồng nhất với auto path.
   - Giảm: cả `push` và `workflow_dispatch` dùng chung deploy scripts.

# (d) Tiêu chí verify tối thiểu
1. Trigger:
- Push vào `uat` ở từng service path -> đúng workflow chạy.
- Có thể chạy tay qua `workflow_dispatch` với cùng outcome.

2. Bootstrap idempotent:
- Chạy deploy lần 1 trên VPS trắng: tạo thư mục + lên container thành công.
- Chạy lại lần 2 không phá trạng thái, không lỗi do resource đã tồn tại.

3. Runtime:
- Backend health endpoint trả OK.
- Frontend truy cập được.
- MQTT Bridge container up ổn định (không restart loop).

4. Security/logging:
- Logs Actions không lộ secret values.
- Không commit `.env` hay credential file vào repo.

# Unresolved questions
- Chuẩn endpoint health của Frontend đang dùng check URL nào trên UAT (root hay route riêng) để harden verify step?
- Với MQTT Bridge, có chấp nhận verify bằng container status + log pattern hay cần endpoint health riêng?