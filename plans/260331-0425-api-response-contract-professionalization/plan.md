---
title: "Professionalize backend API response contract"
description: "Phased plan to standardize error and success response contracts without breaking existing clients."
status: pending
priority: P2
effort: "11d"
branch: feature/cicd
tags: [api, response-contract, backend]
created: 2026-03-31
---

# Implementation Plan Overview

## Goal
Chuẩn hóa API response backend theo hướng professional: error theo RFC7807 + extension fields, success envelope mỏng, rollout không breaking.

## Scope
- In-scope: response contract, middleware/error serializer, controller adoption, contract tests, observability, governance.
- Out-of-scope: đổi business logic domain, thay auth/session model, re-architecture service layer.

## Phase status
- Phase 01 — Contract design & migration strategy: `pending` (0%) → [phase-01-contract-design-and-migration-strategy.md](./phase-01-contract-design-and-migration-strategy.md)
- Phase 02 — Backend response layer refactor: `pending` (0%) → [phase-02-backend-response-layer-refactor.md](./phase-02-backend-response-layer-refactor.md)
- Phase 03 — Endpoint adoption & compatibility rollout: `pending` (0%) → [phase-03-endpoint-adoption-and-compatibility-rollout.md](./phase-03-endpoint-adoption-and-compatibility-rollout.md)
- Phase 04 — Validation, testing & governance: `pending` (0%) → [phase-04-validation-testing-and-governance.md](./phase-04-validation-testing-and-governance.md)

## Key design decisions (target)
- Error contract dùng RFC7807 (`application/problem+json`) + extension: `code`, `requestId`, `errors[]`.
- Success contract giữ mỏng: `data` + optional `meta` (chỉ khi pagination/diagnostic cần).
- Migration non-breaking theo phased rollout + opt-in versioning/gating.
- Quality gates: contract test bắt buộc + observability metrics + ownership rõ ràng backend/frontend/mobile.

## Dependencies
- Backend: `response.util.ts`, `error-handler.middleware.ts`, `request-id.middleware.ts`, toàn bộ controllers dùng `sendOk/sendCreated`.
- Consumer: frontend web, mobile app, external integrators (nếu có).
- Governance: owner matrix cho schema, rollout, deprecation.

## Milestones
- M1: Contract spec + migration ADR approved.
- M2: Shared response layer refactor done, compatibility gate active.
- M3: High-traffic endpoints migrated, client opt-in validated.
- M4: Contract tests + dashboards + runbook + deprecation policy active.

## Exit criteria
- 100% endpoint errors serialize theo RFC7807 profile.
- Success response không phát sinh breaking change ngoài kế hoạch đã thông báo.
- Contract test pass CI; dashboards có error-rate theo `code/status/requestId`.

## Unresolved questions
- Chốt cơ chế compatibility: header version (`X-API-Response-Version`) hay route version (`/v2`).
- Chốt mức bắt buộc của `meta` trong success envelope.
- Chốt timeline deprecate format cũ cho frontend/mobile.

## Validation Log

### Session 1 — 2026-03-31
**Trigger:** Re-validation after initial plan creation via `/plan:validate`.
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Cho rollout contract mới, bạn muốn cơ chế versioning nào?
   - Options: Header-gated (Recommended) | Route v2 | Hybrid
   - **Answer:** Other
   - **Custom input:** doi triet de nhu refactor luon, khong can giu lai ban cu
   - **Rationale:** Quyết định này đổi hướng từ non-breaking rollout sang hard cutover; ảnh hưởng trực tiếp Phase 01, 03 và governance release.

2. **[Assumptions]** `requestId` nên bắt buộc ở đâu trong response contract?
   - Options: Error only (Recommended) | Success + Error | Header only
   - **Answer:** Success + Error
   - **Rationale:** Bắt buộc traceability end-to-end ở mọi response, tăng quan sát vận hành và giảm MTTR khi incident.

3. **[Architecture]** Field `instance` trong RFC7807 nên dùng định dạng nào?
   - Options: Path only (Recommended) | Full URL | Path + requestId
   - **Answer:** Path + requestId
   - **Rationale:** Tránh lộ host nội bộ nhưng vẫn giữ truy vết mạnh qua request context.

4. **[Tradeoffs]** Schema `errors[]` cho validation nên chốt mức nào?
   - Options: field+message+code (Recommended) | +rejectedValue | field+message
   - **Answer:** field+message+code (Recommended)
   - **Rationale:** Cân bằng machine-readable và bảo mật dữ liệu người dùng; tránh lộ payload nhạy cảm.

#### Confirmed Decisions
- Versioning strategy: Hard cutover, không giữ format cũ — giảm độ phức tạp compatibility nhưng tăng rủi ro rollout.
- requestId policy: Bắt buộc cho success + error.
- RFC7807 `instance`: Path + requestId context.
- Validation error schema: `errors[] = { field, message, code }`.

#### Action Items
- [ ] Cập nhật plan từ phased non-breaking rollout sang single-contract refactor rollout.
- [ ] Bỏ toàn bộ decision gates dựa trên v1/v2 compatibility.
- [ ] Chuẩn hóa yêu cầu `requestId` bắt buộc toàn bộ response.
- [ ] Cập nhật test/governance theo target "one contract only".

#### Impact on Phases
- Phase 01: Đổi strategy từ compatibility/versioning sang hard cutover; cập nhật ADR và risk register theo breaking rollout.
- Phase 02: Loại bỏ response version resolver; tập trung serializer/builder cho một contract duy nhất.
- Phase 03: Đổi từ wave v1/v2 sang endpoint migration theo domain nhưng một chuẩn response thống nhất.
- Phase 04: Đổi test matrix từ v1/v2 sang single-contract conformance + stricter CI gate.
