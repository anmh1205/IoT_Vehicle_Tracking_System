---
title: "System-admin + VictoriaMetrics CRUD production-ready plan"
description: "Kế hoạch production-ready cho system-admin và VictoriaMetrics CRUD theo phased rollout an toàn."
status: pending
priority: P2
effort: 20d
branch: feat/all-feat
tags: [system-admin, victoriametrics, rbac, api-contract, rollout]
created: 2026-04-21
---

# Implementation Plan Overview

## Scope
Hoàn thiện system-admin page + CRUD VictoriaMetrics cho 3 nhóm: (1) datasource/query templates, (2) alert/recording rules, (3) tenant/retention/access control; bảo đảm API contracts, RBAC, validation, auditability, idempotency, rollback/backfill.

## Phases
| Phase | Status | Progress | File |
|---|---|---:|---|
| 01. Research synthesis | pending | 0% | [phase-01-research-synthesis.md](./phase-01-research-synthesis.md) |
| 02. Domain and API design | pending | 0% | [phase-02-domain-and-api-design.md](./phase-02-domain-and-api-design.md) |
| 03. Backend system-admin VM CRUD | pending | 0% | [phase-03-backend-system-admin-vm-crud.md](./phase-03-backend-system-admin-vm-crud.md) |
| 04. Frontend system-admin VM CRUD | pending | 0% | [phase-04-frontend-system-admin-vm-crud.md](./phase-04-frontend-system-admin-vm-crud.md) |
| 05. Testing and quality gates | pending | 0% | [phase-05-testing-and-quality-gates.md](./phase-05-testing-and-quality-gates.md) |
| 06. Rollout and operations | pending | 0% | [phase-06-rollout-and-operations.md](./phase-06-rollout-and-operations.md) |

## Dependency chain
Research → Domain/API → Backend → Frontend → Testing/Quality gates → Rollout/Operations.

## Delivery principles
- YAGNI: mở rộng module `system-admin` hiện có, không tách subsystem mới nếu chưa cần.
- KISS: flow CRUD rõ ràng draft/validate/activate/rollback, tránh orchestration phức tạp.
- DRY: tái dùng service/repo/controller/hook/table patterns hiện hữu.
- Low-resource mindful: ưu tiên validation offline + bounded integration test; rollout canary nhỏ.

## Milestones
- M1: Chốt schema + API contract + permission matrix.
- M2: Backend CRUD + audit + idempotency + revisioning chạy end-to-end.
- M3: Frontend admin UX hoàn chỉnh với blast-radius preview và xác nhận destructive ops.
- M4: Test gates pass; rollback/backfill playbook rehearsal pass.
- M5: Canary rollout thành công, metrics/audit ổn định.

## Unresolved questions
1. N/A sau Validation Session 1 (đã chốt các decision chính).

## Validation Log

### Session 1 — 2026-04-21
**Trigger:** Initial plan creation validation trước khi bắt đầu implementation.
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Phase hiện tại có đưa `vmalert`/`vmauth` vào runtime chính thức luôn không?
   - Options: Có, đưa vào ngay (Recommended) | Chỉ VM-ready contract | Chỉ vmalert trước | Chỉ vmauth trước
   - **Answer:** Có, đưa vào ngay (Recommended)
   - **Rationale:** Quyết định này mở rộng phạm vi từ “contract-ready” sang “runtime-ready”, ảnh hưởng trực tiếp thiết kế phase backend/infra/rollout.

2. **[Scope]** Retention change nên áp dụng theo cơ chế nào?
   - Options: Apply qua deploy window (Recommended) | Hot-apply ngay runtime | Hybrid theo loại change
   - **Answer:** Apply qua deploy window (Recommended)
   - **Rationale:** Chốt cách apply giảm blast radius và xác định rõ yêu cầu maintenance window/runbook ở rollout phase.

3. **[Architecture]** Mức chi tiết RBAC cần chốt ở phase này là gì?
   - Options: Action-level theo resource (Recommended) | Role coarse-grained | Resource-level only
   - **Answer:** Action-level theo resource (Recommended)
   - **Rationale:** Đây là nền cho API authorization, UI capability matrix, audit granularity và test matrix.

4. **[Risks]** Trước khi activate rule, bắt buộc mức validation nào?
   - Options: Syntax + unit + live check canary (Recommended) | Syntax only | Syntax + unit only | Full live check all tenants
   - **Answer:** Full live check all tenants
   - **Rationale:** Tăng độ an toàn trước activate nhưng làm tăng chi phí validate/runtime load, cần phản ánh vào phase backend/testing/rollout.

#### Confirmed Decisions
- Runtime scope: đưa `vmalert` + `vmauth` vào runtime ngay phase hiện tại — để chốt production-ready đầy đủ.
- Retention apply policy: chỉ apply qua deploy window — để kiểm soát thay đổi rủi ro cao.
- RBAC model: action-level theo resource — để enforce least-privilege và audit đúng chuẩn.
- Rule validation gate: full live check all tenants trước activate — ưu tiên an toàn hơn tốc độ.

#### Action Items
- [ ] Cập nhật phase-02 để khóa kiến trúc runtime gồm `vmalert`/`vmauth`, RBAC action-level, retention deploy-window policy.
- [ ] Cập nhật phase-03 để thêm implementation tasks cho runtime integration + full-tenant live validation gate.
- [ ] Cập nhật phase-04 để phản ánh UI permission matrix action-level.
- [ ] Cập nhật phase-05 để thêm test cases cho full live validation và authorization matrix.
- [ ] Cập nhật phase-06 cho rollout sequencing có `vmalert`/`vmauth` + maintenance-window retention.

#### Impact on Phases
- Phase 02: Update **Requirements** và **Architecture** để bắt buộc runtime integration `vmalert`/`vmauth`, RBAC action-level, retention apply qua deploy window, rule validation full-tenant live check.
- Phase 03: Update **Requirements** và **Implementation Steps** để thêm endpoint/flow phục vụ full live validation all tenants và integration runtime services.
- Phase 04: Update **Requirements** để enforce UI capability matrix action-level theo resource.
- Phase 05: Update **Requirements** để thêm test strategy cho full-tenant live validation, permission matrix chi tiết.
- Phase 06: Update **Architecture** và **Implementation Steps** cho staged rollout có `vmalert`/`vmauth` và retention chỉ đổi trong deploy window.