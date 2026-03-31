# Phase 02 - SSH VPS bootstrap lần đầu

## 1) Context links
- Plan tổng: `./plan.md`
- Deploy workflows: `.github/workflows/*-uat.yml`

## 2) Overview
- Priority: P1
- Status: pending
- Mục tiêu: SSH vào VPS, tạo workspace, pull source/image, tạo `.env` lần đầu, chạy `docker compose up -d`.

## 3) Key Insights
- User muốn bootstrap đầy đủ ngay lần đầu, không chỉ chuẩn bị file.

## 4) Requirements
- Functional:
  - Tạo workspace path chuẩn trên VPS.
  - Pull repo/image đúng branch/tag UAT.
  - Tạo `.env` lần đầu từ template/secret mapping.
  - Chạy `docker compose up -d`.
- Non-functional:
  - Script idempotent (chạy lại không phá trạng thái cũ).

## 5) Architecture
- GitHub Action -> SSH -> VPS bootstrap script.
- Script theo thứ tự: mkdir/check path -> pull/update -> render `.env` -> compose up.

## 6) Related code files
- Files to modify:
  - `.github/workflows/backend-uat.yml`
  - `.github/workflows/frontend-uat.yml`
  - `.github/workflows/mqtt-bridge-uat.yml`
- Files to create:
  - `scripts/deploy/bootstrap-vps.sh`
  - `docs/vps-bootstrap-first-deploy.md`
- Files to delete:
  - Không.

## 7) Implementation Steps
1. Viết bootstrap script idempotent.
2. Bind workflow SSH step gọi script bootstrap.
3. Verify service lên bằng health check cơ bản.

## 8) Todo List
- [ ] Hoàn tất script bootstrap VPS.
- [ ] Nối workflow SSH call.
- [ ] Verify first deploy thành công.

## 9) Success Criteria
- VPS bootstrap thành công từ trạng thái trắng.
- `docker compose up -d` chạy lên và service chính reachable.

## 10) Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sai path workspace | Medium | High | Pre-check path + permission |
| `.env` thiếu biến | Medium | High | Validate required keys trước up |
| SSH quyền quá rộng | Medium | High | Giới hạn quyền user deploy nếu có thể |

## 11) Security Considerations
- Ưu tiên SSH key auth.
- Không echo secret ra logs.

## 12) Next Steps
- Bàn giao sang Phase 03 để bật auto deploy `push uat`.

## Unresolved questions
- Không.
