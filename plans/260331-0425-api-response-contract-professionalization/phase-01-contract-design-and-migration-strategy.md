# Phase 01 — Contract design and migration strategy

## Context links
- `docs/codebase-summary.md`
- `docs/code-standards.md`
- `docs/system-architecture.md`
- `docs/project-overview-pdr.md`
- `research/researcher-01-external-api-response-standards.md`
- `research/researcher-02-internal-response-baseline.md`

## Overview
- Priority: P1
- Status: pending
- Mục tiêu: chốt response contract chuẩn + migration strategy non-breaking trước khi đụng code diện rộng.

## Key Insights
- Baseline hiện tại đã có consistency tốt (`success:true/false`, `timestamp`), nên không cần rewrite toàn bộ.
- RFC7807 phù hợp nhất cho error; JSON:API không phù hợp nếu không adopt full spec.
- `requestId` đã có middleware (`X-Request-ID`), có thể reuse làm `requestId` extension field.
- Cần decision gate sớm với frontend/mobile để tránh contract drift.

## Requirements
<!-- Updated: Validation Session 1 - hard cutover single contract -->
- Functional:
  - Định nghĩa canonical error schema theo RFC7807 + extensions: `code`, `requestId`, `errors[]`.
  - Định nghĩa success envelope mỏng: `data` + optional `meta` + bắt buộc `requestId`.
  - Bỏ compatibility policy v1/v2; toàn hệ thống dùng một contract mới sau refactor.
- Non-functional:
  - Chấp nhận breaking change có kiểm soát trong một đợt rollout refactor.
  - Contract rõ ràng để auto-test được.
  - Tài liệu ngắn, rõ, không over-engineer.

## Architecture
- Contract profile:
  - Error: `type`, `title`, `status`, `detail`, `instance`, `code`, `requestId`, `errors[]`.
  - Success: `{ data, meta? }` (không bọc nhiều lớp).
- Version strategy options:
  1) Header-gated (`X-API-Response-Version: 2`) — ít đổi route, rollout linh hoạt.
  2) Route version (`/api/v2`) — tách rõ, chi phí routing/doc cao hơn.
- Khuyến nghị: header-gated trong rollout, route-v2 chỉ dùng nếu cần hard fork.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/utils/response.util.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/middleware/error-handler.middleware.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/middleware/request-id.middleware.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/utils/errors.util.ts`
- Create:
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/contracts/api-response.contract.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/contracts/problem-details.contract.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/contracts/response-versioning.contract.ts`
- Delete:
  - None

## Implementation Steps
1. Draft RFC7807 profile doc cho dự án (fields required/optional, enum code strategy).
2. Define success envelope policy: khi nào có `meta`, khi nào trả raw primitive/list.
3. Chốt compatibility gate (header/route), default behavior, deprecation window.
4. Thiết kế mapping table `domain error -> HTTP status -> problem.code -> errors[]`.
5. Chốt ownership matrix (backend owner, frontend/mobile approver, release owner).
6. Gate review: approve spec trước khi vào refactor phase.

## Todo list
- [ ] Viết contract matrix (success + error).
- [ ] Viết migration decision record (ADR-lite).
- [ ] Chốt versioning gate với frontend/mobile.
- [ ] Chốt deprecation policy format cũ.

## Success Criteria
- Spec có examples cho validation/auth/not-found/conflict/internal.
- Có mapping chuẩn cho `requestId` và `errors[]` field-level.
- Có sign-off từ backend + frontend + mobile owners.
- Không còn ambiguity về default response format trong rollout.

## Risk Assessment
- Risk: Stakeholder không đồng ý strategy versioning.
  - Mitigation: đưa 2 options + cost rõ ràng, quyết định trong 1 meeting.
- Risk: Scope creep (muốn redesign cả success payload toàn hệ thống).
  - Mitigation: giữ scope “error-first + thin-success”, YAGNI strict.

## Security Considerations
- Không trả stack trace/internal DB errors trong `detail`.
- `errors[]` chỉ chứa validation-safe info, không lộ secrets/PII.
- `requestId` dùng để trace, không encode thông tin nhạy cảm.

## Next steps
- Khi Phase 01 approved -> chuyển Phase 02 refactor shared response layer.
- Chuẩn bị checklist backward compatibility cho endpoint owners.

## Unresolved questions
- Có bắt buộc `requestId` hiện diện cả success lẫn error không?
- `instance` sẽ dùng full URL hay path-only để tránh lộ host nội bộ?
- `errors[]` format chốt theo `{field, message, code?}` hay có thêm `rejectedValue`?
