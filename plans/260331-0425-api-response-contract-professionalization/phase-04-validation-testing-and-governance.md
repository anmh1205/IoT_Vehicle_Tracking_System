# Phase 04 — Validation, testing and governance

## Context links
- `phase-02-backend-response-layer-refactor.md`
- `phase-03-endpoint-adoption-and-compatibility-rollout.md`
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/middleware/__tests__/error-handler.test.ts`
- `docs/development-roadmap.md`
- `docs/project-changelog.md`

## Overview
- Priority: P1
- Status: pending
- Mục tiêu: khóa chất lượng contract bằng test + observability + ownership governance để tránh regression.

## Key Insights
- Nếu chỉ migrate mà không có contract tests, regression gần như chắc chắn khi thêm endpoint mới.
- Observability theo `code/status/requestId/version` là bắt buộc để vận hành rollout an toàn.
- Governance cần owner rõ: ai approve thay đổi schema, ai chịu trách nhiệm deprecation.

## Requirements
<!-- Updated: Validation Session 1 - one-contract conformance -->
- Functional:
  - Thêm contract test suite cho success/error của một contract duy nhất.
  - Thêm metrics/log schema cho problem code + requestId bắt buộc.
  - Thiết lập governance checklist cho PR và release.
- Non-functional:
  - CI fail nếu contract drift không được duyệt.
  - Dashboard quan sát được error trends theo endpoint/problem code.
  - Tài liệu runbook dễ dùng cho on-call.

## Architecture
- Testing stack:
  - Unit tests: serializer + resolver + error mapping.
  - Integration tests: representative endpoints per wave.
  - Contract snapshot/schema validation: assert payload shape.
- Observability:
  - Structured log fields: `requestId`, `status`, `code`, `contractVersion`, `path`.
  - Metrics: error_rate_by_code, v2_adoption_ratio, parsing_error_count (client side nếu có).
- Governance:
  - CODEOWNERS/approval rule cho contract files.
  - PR template checklist cho backward compatibility.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/middleware/__tests__/error-handler.test.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/**/__tests__/*.test.ts`
  - `.github/workflows/*` (nếu cần thêm contract gate)
  - `docs/development-roadmap.md`
  - `docs/project-changelog.md`
  - `docs/system-architecture.md`
- Create:
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/tests/contracts/api-response.contract.test.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/tests/contracts/problem-details.contract.test.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/docs/api-response-governance-runbook.md`
- Delete:
  - None

## Implementation Steps
1. Định nghĩa contract assertions (required/optional fields, type checks, version behavior).
2. Viết contract tests cho core endpoint nhóm Wave 1/2/3.
3. Thêm logging/metrics fields và dashboard queries cơ bản.
4. Thiết lập CI gate: fail khi contract tests fail hoặc schema drift.
5. Viết governance runbook: ownership, change process, deprecation protocol.
6. Cập nhật roadmap/changelog/architecture docs theo trạng thái rollout.

## Todo list
- [ ] Hoàn tất test matrix (success/error, v1/v2).
- [ ] Hoàn tất observability fields + dashboard panel.
- [ ] Hoàn tất CI contract gate.
- [ ] Hoàn tất governance runbook + ownership table.
- [ ] Hoàn tất cập nhật docs chính thức.

## Success Criteria
- Contract tests chạy trong CI, fail đúng khi drift.
- Dashboard quan sát được adoption v2 và error profile theo code.
- Có owner rõ cho mọi thay đổi contract.
- Có runbook rollback/deprecate đã review.

## Risk Assessment
- Risk: chi phí test maintenance tăng.
  - Mitigation: test tập trung contract-critical endpoints, không snapshot tràn lan.
- Risk: metric cardinality cao do path/requestId.
  - Mitigation: chuẩn hóa label, không gắn raw dynamic path ids.

## Security Considerations
- Logs/metrics không chứa PII hoặc token.
- Contract tests có case bảo vệ against sensitive leakage ở error detail.
- Governance yêu cầu security review khi thêm extension fields mới.

## Next steps
- Sau phase này: chuyển trạng thái plan sang in-progress/completed theo tiến độ thực.
- Mở follow-up plan cho v1 retirement cleanup nếu đã đủ adoption.

## Unresolved questions
- Có cần security team sign-off bắt buộc cho mọi thay đổi `errors[]` schema không?
- CI gate đặt ở pull request hay chỉ main branch?
