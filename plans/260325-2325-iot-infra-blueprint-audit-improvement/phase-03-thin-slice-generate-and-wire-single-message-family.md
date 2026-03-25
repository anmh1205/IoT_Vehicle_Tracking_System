# Phase 03 - Thin slice generate and wire single message family

## Context links
- Previous: [phase-02-define-minimum-contract-and-profile-baseline.md](./phase-02-define-minimum-contract-and-profile-baseline.md)
- Plan: [plan.md](./plan.md)

## Overview
- Priority: P1
- Status: pending
- Brief: chạy end-to-end cho 1 family (`rawdata`) bằng config-driven tối thiểu.

## Key insights
- `handleRawData` đã đẩy VM + VL + batch DB (`.../handlers/rawdata.handler.ts:77-121`).
- Dispatch hiện `switch` suffix (`.../src/index.ts:35-58`) -> điểm chèn map config đầu tiên.
- `writeDeviceTelemetry` hiện tự sinh metric name theo key (`.../victoriametrics.ts:55-59`).

## Requirements
- Functional:
1. Tạo dispatch map từ config cho đúng 1 family.
2. Tạo validator binding từ schema ref cho `rawdata`.
3. Wire projection config cho metrics/logs naming policy.
- Non-functional:
1. Không phá behavior hiện tại của `status/events/firmware`.
2. Có fallback về hard-code cũ nếu config thiếu.

## Architecture
- Adapter layer mỏng:
1. `topic -> message_family`
2. `message_family -> validator + projection policy`
3. handler vẫn reuse logic cũ
- Guardrail:
1. feature flag `CONTRACT_DRIVEN_RAWDATA=true`.

## Related code files
- References:
1. `.../src/index.ts`
2. `.../src/handlers/rawdata.handler.ts`
3. `.../src/validators/payload.validator.ts`
4. `.../src/infrastructure/victoriametrics.ts`
5. `.../src/infrastructure/victorialogs.ts`

## Implementation steps
1. Tạo config object tối thiểu cho `rawdata`.
2. Refactor route layer để đọc config trước, fallback switch cũ.
3. Cố định metric/log field mapping tránh cardinality trôi.
4. Chạy replay payload mẫu, so sánh output trước/sau.

## Todo list
- [ ] Rawdata contract wiring xong.
- [ ] Feature flag + fallback xong.
- [ ] Replay parity report xong.

## Success criteria
- `rawdata` đi full path như cũ, nhưng qua contract map.
- Không có regression ở topic family khác.

## Risk assessment
- Risk: refactor route đụng runtime ổn định.
- Mitigation: toggle flag + canary subset devices.

## Security considerations
- Không log thẳng auth_token trong bất kỳ projection mới.

## Next steps
- Dùng thin-slice output để set gate phase 04.

## Unresolved questions
- Có cần parity SLA (exact match %) trước khi bật default không?
