---
title: "Firmware FE refactor plan theo benchmark IVM26"
description: "Refactor trang firmware dashboard theo IA rõ ràng, giảm cognitive load, giữ tương thích API/realtime hiện tại."
status: pending
priority: P2
effort: 22h
branch: feat/all-feat
tags: [firmware, frontend, refactor, ux, ivm26]
created: 2026-04-20
---

# Overview
- Scope: chỉ planning cho refactor firmware FE page, không implement.
- Goal: UX rõ ràng hơn, state/data boundary gọn hơn, migration an toàn không break luồng OTA hiện tại.
- Principle: YAGNI/KISS/DRY, ưu tiên sửa file hiện có, tránh tạo file mới không cần.

## Inputs đã tổng hợp
- Docs: `docs/codebase-summary.md`, `docs/code-standards.md`, `docs/system-architecture.md`, `docs/project-overview-pdr.md`.
- Scout: `scout/scout-01-firmware-fe-scope.md`.
- Research: `research/researcher-01-current-fe-firmware-analysis.md`, `research/researcher-02-ivm26-firmware-patterns.md`.

## Current vs IVM26 (học gì / không copy)
- Học từ IVM26:
  - IA stack rõ: stats -> list -> assignment/deploy -> logs/history.
  - Dialog gating cho action phá hủy/rủi ro.
  - Loading/empty/error state hiển thị tường minh.
- Không copy nguyên xi:
  - Không dùng lifecycle mơ hồ kiểu `stable/fixed` trộn nghĩa.
  - Không giữ action icon-only khó discover.
  - Không để refresh/invalidation rải rác nhiều nơi.

## Phase list
| Phase | File | Status | Progress |
|---|---|---|---|
| 01. Current state + target UX | `./phase-01-current-state-and-target-ux.md` | pending | 0% |
| 02. IA + page skeleton | `./phase-02-information-architecture-and-page-skeleton.md` | pending | 0% |
| 03. Data + state refactor | `./phase-03-data-and-state-refactor.md` | pending | 0% |
| 04. Progressive disclosure + component boundaries | `./phase-04-progressive-disclosure-and-component-boundaries.md` | pending | 0% |
| 05. Safe migration + verification | `./phase-05-safe-migration-and-verification.md` | pending | 0% |

## Backlog ưu tiên
- P0:
  - Chốt target UX flow first-fold + primary actions.
  - Tách data/state orchestration khỏi page render để giảm file page “god component”.
  - Giữ tương thích API contract, realtime event, role gate.
- P1:
  - Progressive disclosure cho history/deploy context.
  - Chuẩn hóa loading/empty/error surface theo shared components.
  - Giảm toast spam realtime, ưu tiên milestone/error.
- P2:
  - Tối ưu query fan-out deployments và khả năng scale list/history.
  - Rà accessibility labels, keyboard/touch targets theo code standards.

## Dependencies chính
- API firmware hiện tại (`src/lib/api/firmware.ts`) phải giữ backward compatibility.
- Shared UI (`data-table`, `stat-card`, `PageContainer`) dùng làm nền, không fork pattern mới.
- Permission gate `useRoleAccess().canManageFirmware` giữ nguyên semantics.

## Acceptance gates (UX + chức năng)
- User thấy rõ 1-2 primary actions ngay first fold (upload/deploy), không bị chìm trong metadata.
- Không đổi behavior API/realtime hiện có, không regress upload/deploy/activate/deactivate/delete.
- Error/loading/empty state có đủ trên section quan trọng.
- Manual operator flow (upload -> deploy -> theo dõi) hoàn thành không cần đọc code.

## Test checklist (định hướng)
- Unit: selectors/transformers cho summary + status mapping + action guards.
- Integration: page orchestration với query invalidate + dialog action success/fail.
- Manual UI: role matrix, responsive, keyboard nav, realtime update noise control.

## Unresolved questions
- Có endpoint summary tổng hợp để giảm fan-out `getDeployments(item.id)` không?

## Validation Log

### Session 1 — 2026-04-20
**Trigger:** Initial plan creation validation trước khi implement
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture/Scope]** Persona chính của firmware page nên tối ưu cho ai?
   - Options: Release operator (Recommended) | Support/monitoring | Cân bằng cả hai
   - **Answer:** Cân bằng cả hai
   - **Rationale:** IA phải không thiên lệch hoàn toàn về thao tác hay giám sát; first-fold cần vừa có CTA vừa có signal monitoring cốt lõi.

2. **[Architecture]** Chi tiết deployment history nên đặt ở đâu để giảm rối mắt?
   - Options: Drawer chi tiết (Recommended) | Inline expand | Tab riêng
   - **Answer:** Drawer chi tiết (Recommended)
   - **Rationale:** Giữ list gọn để scan nhanh, nhưng vẫn mở được metadata sâu khi debug.

3. **[Assumptions/Tradeoff]** Chính sách realtime cho progress OTA nên theo hướng nào?
   - Options: Milestone + lỗi (Recommended) | Toast mọi progress | Tắt toast progress
   - **Answer:** Toast mọi progress
   - **Rationale:** Team muốn độ phản hồi realtime cao; plan phải giữ tín hiệu progress liên tục và xử lý rủi ro nhiễu UI.

4. **[Risk/Quality]** Mức quality gate tối thiểu trước merge cho refactor firmware FE là gì?
   - Options: Lint+typecheck+build+manual (Recommended) | Thêm integration test bắt buộc | Thêm unit+integration bắt buộc
   - **Answer:** Lint+typecheck+build+manual (Recommended)
   - **Rationale:** Cân bằng tốc độ và an toàn trong bối cảnh coverage hiện tại chưa cao.

#### Confirmed Decisions
- Persona firmware page: Cân bằng cả vận hành + giám sát — first-fold phải có cả CTA và monitoring signal.
- Deployment history details: Dùng drawer chi tiết — giữ main list condensed.
- Realtime progress policy: Giữ toast mọi progress.
- Merge gate: Lint + typecheck + build + manual checklist.

#### Action Items
- [x] Cập nhật Phase 01/02 để phản ánh persona “cân bằng cả hai”.
- [x] Cập nhật Phase 04 để khóa phương án drawer cho history details.
- [x] Cập nhật Phase 03 để phản ánh realtime policy “toast mọi progress”.
- [x] Cập nhật Phase 05 để khóa quality gate đã chốt.

#### Impact on Phases
- Phase 01: chỉnh target UX first-fold thành dual-focus (action + monitoring), bỏ ambiguity persona.
- Phase 02: IA section A phải chứa cả CTA và monitoring snapshot, không chỉ operator CTA.
- Phase 03: realtime handling chuyển sang progress toast per-event policy.
- Phase 04: chi tiết deployment history dùng drawer làm pattern mặc định.
- Phase 05: quality gate chính thức là lint/typecheck/build + manual regression checklist.
