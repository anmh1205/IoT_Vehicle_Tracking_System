# Planner Report - Setup CI/CD GitHub + VPS + Env Standardization

## Tóm tắt quyết định
1. Chọn chiến lược **cân bằng**: giữ workflow per-service theo path, thêm PR gate và reusable build logic, không nhảy K8s (YAGNI).
2. Chuỗi phụ thuộc bắt buộc: **CI PR gate -> build/push image immutable -> CD VPS service-by-service + healthcheck -> rollback nếu fail**.
3. Chuẩn hóa `.env` theo 7 nhóm key names: `core/db/mqtt/auth/frontend/observability/optional`, chỉ dùng key names, không chứa values.
4. Rollback chuẩn dựa trên **digest hoặc `sha-<commit>`**, không rollback từ `latest`.
5. Bổ sung branch protection + required checks để policy không chỉ nằm trong YAML mà thành merge gate thực tế.

## Hiện trạng đã map
- Không thấy file `iot-vehicle-tracking-system-cloud/.github/workflows/backend-ci-cd.yml`.
- Hiện có các workflow UAT chính ở root `.github/workflows/`:
  - `backend-uat.yml`, `frontend-uat.yml`, `mqtt-bridge-uat.yml`
  - `mobile-uat.yml`
  - `postgresql-uat.yml`, `emqx-uat.yml`, `grafana-uat.yml`
  - `victoria-metrics-uat.yml`, `victoria-logs-uat.yml`, `npm-uat.yml`
- Mẫu hiện tại thiên về `push uat`; thiếu lớp PR gate tổng thể.

## Cấu trúc plan đã tạo
- `plan.md` (<=80 dòng, có YAML frontmatter, phase list + dependency + overall risk matrix)
- 5 phase files end-to-end:
  - Baseline + env canonical map
  - PR gate + branch protection
  - Build/push image policy
  - VPS rolling deploy + health/rollback
  - Runbook incident + cutover validation

## Risk matrix tổng hợp
| Risk | Likelihood | Impact | Decision |
|---|---|---|---|
| Workflow trigger quá rộng | Medium | High | Bắt buộc path filters + stable check names |
| Secret exposure | Medium | High | No secret values in docs/logs/artifacts |
| Version drift khi deploy | Medium | High | Rolling by service + fail-fast + rollback immediate |
| Rollback lỗi do mutable tag | Medium | High | Pin digest/SHA as source of truth |
| Env key drift | High | Medium | Canonical map + deprecate checklist |

## Unresolved questions
- Registry chuẩn cho sprint này: DockerHub hay GHCR?
- Có yêu cầu production promotion tách riêng khỏi `uat` ngay bây giờ không?
- Có migration DB phá backward-compatibility trong phạm vi rollout này không?
