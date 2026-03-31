# Research Report: CD từ GitHub lên 1 VPS cho Docker Compose multi-service

**Timestamp:** 2026-03-31 17:37 Asia/Saigon
**Scope:** chiến lược CD cho hệ thống 1 VPS, ưu tiên KISS/YAGNI, không lộ secret, không sửa code.

## Executive Summary
- Khuyến nghị mạnh: GitHub Actions build/push image lên GHCR, VPS chỉ pull image + `docker compose up -d` theo từng service.
- Với 1 VPS + 1 instance/service, chỉ đạt **low-downtime thực tế**, không phải zero-downtime thật. Muốn zero-downtime cần 2 replica hoặc 2 VPS + load balancer.
- Secret nên tách rõ: build-time chỉ giữ public config; runtime secrets nằm ngoài repo, trên VPS, quyền tối thiểu, rotate định kỳ.

## Research Methodology
- Sources consulted: README nội bộ + docs Docker/GitHub Actions + best-practice vận hành VPS.
- Key terms: GHCR, Docker Compose healthcheck, runtime secrets, SSH hardening, rollback, observability.
- Evaluation criteria: an toàn, đơn giản, dễ vận hành cho team nhỏ, rollback nhanh, ít bề mặt lỗi.

## 1) Mô hình deploy VPS
- User deploy riêng: `deploy`/`ops`, không dùng root login qua SSH.
- SSH hardening: key-only auth, tắt password login, tắt root SSH, giới hạn IP nếu được, bật fail2ban.
- Firewall: chỉ mở 22, 80, 443; port admin/dashboard không public nếu không cần.
- Docker: ưu tiên network nội bộ; chỉ reverse proxy ra ngoài.
- Backup: snapshot VPS + backup Postgres + backup file `.env`/compose snapshot (đều mã hóa, offsite).

## 2) Chiến lược env/secret management
- Tách **build-time** và **runtime**:
  - Build-time: chỉ biến public của frontend, ví dụ `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`.
  - Runtime: DB/MQTT/session/admin secrets, ví dụ password, cookie, JWT/session secret.
- Biến bắt buộc vs tùy chọn:
  - Bắt buộc: DB password, MQTT password, session secret, registry pull auth, admin passwords.
  - Tùy chọn: Firebase, debug flags, telemetry extras.
- Loại bỏ dư thừa:
  - Chuẩn hóa `POSTGRES_PASSWORD` vs `POSTGRESQL_PASSWORD` về 1 tên canonical.
  - Chỉ giữ 1 nguồn cho URL public; mobile/web nên dùng endpoint cấu hình rõ, không nhân bản nhiều biến trùng nghĩa.
- Lưu secret trên VPS: file riêng từng service, `chmod 600`, owner là deploy user hoặc root, không commit vào repo.

## 3) Chiến lược image build/publish
- Chọn **GHCR** nếu repo private và team nhỏ: ít hạ tầng, tích hợp GitHub Actions tốt.
- Tag image nên pin theo:
  - `sha-<gitsha>` để rollback chính xác.
  - `<semver>` nếu có release.
  - `latest` chỉ dùng cho nhánh non-prod, không dùng làm source of truth.
- Workflow tối thiểu:
  - build test -> push image -> SSH vào VPS -> pull image mới -> recreate service.
- VPS pull private image: dùng token read-only cho GHCR, lưu trên VPS, không dùng quyền vượt mức.

## 4) Low/zero-downtime thực tế với docker compose
- Thực tế an toàn nhất: **service-by-service rolling**.
- Trình tự: pull image -> `docker compose up -d --no-deps <service>` -> chờ healthcheck OK -> chuyển sang service kế tiếp.
- Healthcheck gate bắt buộc cho backend, frontend, bridge, proxy và DB critical path.
- Với 1 container/service, downtime thường chỉ vài giây; nếu cần không gián đoạn thật, phải chạy song song 2 bản và có LB.

## 5) Rollback plan
- Pin image theo SHA; không deploy từ tag mơ hồ.
- Lưu snapshot trước deploy:
  - compose file phiên bản trước
  - env snapshot đã sanitize
  - image digest cũ
- DB migration safety:
  - ưu tiên expand/contract
  - chạy backup trước migration phá hủy
  - tách migrate khỏi deploy app nếu có thể
  - rollback app phải tương thích ngược với schema cũ trong giai đoạn chuyển tiếp.

## 6) Observability + incident response
- Tối thiểu phải có:
  - container logs (`docker logs`)
  - health endpoints
  - metrics backend
  - alert cho restart loop, disk đầy, DB down, broker down
- Incident flow gọn:
  1. kiểm tra health/containers
  2. xem logs theo service
  3. xác định image tag đang chạy
  4. rollback nếu lỗi do deploy
  5. backup/restore nếu lỗi dữ liệu.

## 7) Risk matrix
| Risk | Likelihood | Impact | Mitigation |
|---|---:|---:|---|
| Lộ secret qua repo/log | Med | High | secret ngoài repo, masked logs, quyền file 600 |
| Deploy nửa chừng gây lệch version | Med | High | deploy theo service + healthcheck gate + pin tag |
| DB migration hỏng | Med | High | backup trước, migration backward-compatible |
| Disk đầy do logs/images | High | Med | log rotation, prune policy, alert disk |
| Public admin port bị lộ | Med | High | firewall, reverse proxy, VPN/IP allowlist |

## 8) Recommendation cuối cùng + chuẩn hóa env
- Recommendation: GHCR + GitHub Actions + SSH deploy + compose rolling one-service-at-a-time + healthcheck gate + rollback bằng image digest.
- Không over-engineer Argo/Swarm/K8s cho 1 VPS; YAGNI.
- Nhóm env nên chuẩn hóa/rút gọn:
  1. **Core app**: `APP_ENV`, `NODE_ENV`, `PORT`, `TZ`
  2. **Database**: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
  3. **MQTT/EMQX**: `MQTT_HOST`, `MQTT_PORT`, `MQTT_USERNAME`, `MQTT_PASSWORD`, `EMQX_DASHBOARD_*`, `EMQX_NODE_COOKIE`
  4. **Auth/session**: `SESSION_SECRET` (và JWT secret nếu có)
  5. **Frontend public**: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`
  6. **Observability**: `METRICS_PASSWORD`, `GRAFANA_ADMIN_PASSWORD` (chuẩn hóa tên theo vendor nếu dùng image chính thức)
  7. **Optional/mobile**: `WEB_APP_URL`, `FIREBASE_PROJECT_ID` chỉ khi thật sự dùng.

## References
- Project README: `README.md`
- Docker Compose startup/healthcheck: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose env vars: https://docs.docker.com/compose/environment-variables/
- GHCR + GitHub Actions: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry/publishing-and-installing-a-package-with-github-actions
- GitHub Actions secrets: https://docs.github.com/actions/security-guides/using-secrets-in-github-actions

## Unresolved questions
- VPS có đủ CPU/RAM cho toàn bộ stack hay cần tách observability sang máy khác?
- Có dùng reverse proxy nào làm chuẩn: NPM hiện tại hay chuyển sang Caddy/Traefik?
- DB migration hiện tại đã có workflow riêng hay chưa?