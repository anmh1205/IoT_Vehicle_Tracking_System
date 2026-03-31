---
title: "Setup CI/CD tối giản kiểu IVM26 (GitHub env + SSH VPS bootstrap)"
description: "Chỉ làm 3 bước: set GitHub env/secrets, SSH bootstrap VPS lần đầu, auto deploy khi push uat."
status: pending
priority: P2
effort: "8h"
branch: "feature/cicd"
tags: [cicd, github-actions, vps, ssh, uat]
created: 2026-03-31
---

# Kế hoạch tổng quan (đã rút gọn)

## Mục tiêu
- Chỉ triển khai đúng scope user yêu cầu kiểu IVM26:
  1) Set env/secrets cho GitHub repo.
  2) SSH vào VPS để bootstrap CD lần đầu (workspace, pull, tạo `.env`, `docker compose up -d`).
  3) Tự động deploy khi `push` nhánh `uat`.

## Phases và tiến độ
- [ ] **Phase 01 (0%)**: [GitHub env/secrets baseline](./phase-01-baseline-and-env-standardization.md)
- [ ] **Phase 02 (0%)**: [SSH VPS bootstrap lần đầu](./phase-02-pr-gate-and-branch-protection.md)
- [ ] **Phase 03 (0%)**: [Auto deploy on push uat](./phase-03-image-build-and-publish.md)
- [ ] **Phase 04 (Deferred)**: [Out of scope sprint này](./phase-04-vps-cd-rolling-healthcheck-rollback.md)
- [ ] **Phase 05 (Deferred)**: [Out of scope sprint này](./phase-05-runbook-and-cutover-validation.md)

## Dependency gates
1. Phase 01 xong mới được cấp secret vào workflow deploy.
2. Phase 02 xong mới bật trigger auto deploy.
3. Phase 03 chỉ chạy với `push uat` và fail-fast nếu bootstrap/runtime fail.

## Risk matrix toàn plan
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Secret sai/thiếu làm deploy fail | Medium | High | Checklist required secrets + validate trước deploy |
| SSH bootstrap sai path/quyền | Medium | High | Script idempotent + kiểm tra thư mục trước khi run |
| `.env` lần đầu sai format | Medium | High | Tạo từ template + verify biến bắt buộc |
| Deploy tự động gây downtime ngắn | Medium | Medium | Service restart theo thứ tự + health check cơ bản |

## Deliverables
- 1 workflow deploy `push uat` + manual fallback.
- Script/bootstrap steps trên VPS cho lần đầu.
- Tài liệu key names env/secrets tối thiểu (không chứa secret values).

## Validation Log

### Session 1 — 2026-03-31
- Đã xác nhận: GHCR, UAT-only, policy workflow guard hiện tại.

### Session 2 — 2026-04-01
**Trigger:** User yêu cầu rút scope về đúng kiểu IVM26.
**Questions asked:** 3

#### Confirmed Decisions
- Scope: chỉ GitHub env/secrets + SSH VPS bootstrap + auto deploy.
- Deploy trigger: tự động khi `push uat`.
- Bootstrap VPS: setup đầy đủ và `docker compose up -d` ngay lần đầu.

#### Impact on Phases
- Phase 01-03 giữ lại và rút gọn.
- Phase 04-05 chuyển deferred, không thực hiện trong sprint này.

## Unresolved questions
- Không.
