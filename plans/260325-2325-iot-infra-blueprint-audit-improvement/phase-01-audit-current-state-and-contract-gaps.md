# Phase 01 - Audit current state and contract gaps

## Context links
- Blueprint: `plans/260325-2126-iot-infra-rapid-bootstrap-blueprint/plan.md`
- Plan: [plan.md](./plan.md)
- Report: `plans/reports/audit-260325-2325-iot-infra-blueprint-gap-risk.md`

## Overview
- Priority: P1
- Status: pending
- Brief: lập baseline thật, đo gap theo phase 01..05, khóa phạm vi tối thiểu.

## Key insights
- Routing/dispatch đang hard-code theo suffix (`.../src/index.ts:35-58`).
- Topics đang fixed constants, chưa có contract catalog (`.../constants/topics.ts:1-6`).
- Validators nằm trong code, chưa có version contract ngoài (`.../validators/payload.validator.ts:3-50`).
- UAT workflows infra deploy độc lập, chưa có gate hợp nhất (`.github/workflows/*-uat.yml`).

## Requirements
- Functional:
1. Lập gap matrix phase 01..05 (plan vs codebase).
2. Lập risk matrix likelihood/impact/mitigation.
3. Chốt decision log cần owner + deadline.
- Non-functional:
1. Evidence có path:line, không phán đoán cảm tính.
2. Scope chỉ ingestion/infra liên quan blueprint.

## Architecture
- Audit lens: Contract -> Runtime profile -> Generate -> CI safety -> Ops playbook.
- Output: 1 report duy nhất làm source of truth cho phase 02-05.

## Related code files
- Files to inspect:
1. `iot-vehicle-tracking-system/Tracking_MqttBridge/src/index.ts`
2. `iot-vehicle-tracking-system/Tracking_MqttBridge/src/constants/topics.ts`
3. `iot-vehicle-tracking-system/Tracking_MqttBridge/src/validators/payload.validator.ts`
4. `iot-vehicle-tracking-system/Tracking_PostgreSQL/init/*.sql`
5. `.github/workflows/*-uat.yml`
- Files to modify/create in this phase:
1. `plans/reports/audit-260325-2325-iot-infra-blueprint-gap-risk.md`

## Implementation steps
1. Đọc blueprint cũ + research synthesis.
2. Trích evidence tối thiểu cho từng domain (bridge/db/ci/obs).
3. Chấm gap theo phase 01..05.
4. Chấm risk + đề xuất mitigation tối thiểu.
5. Xuất decision log và thin-slice plan 2 tuần.

## Todo list
- [ ] Gap matrix hoàn chỉnh.
- [ ] Risk matrix hoàn chỉnh.
- [ ] Decision log + owners draft.

## Success criteria
- Team đọc 1 file biết ngay thiếu gì, làm gì trước.
- Không có phase nào “green” nếu thiếu evidence.

## Risk assessment
- Risk: audit quá rộng, loãng.
- Mitigation: giữ scope ingestion stack + CI UAT.

## Security considerations
- Không trích secrets/env thật trong report.
- Đánh dấu rõ auth/token flow hiện tại để phase sau harden.

## Next steps
- Handover kết quả cho phase 02 khóa minimum contract.

## Unresolved questions
- Không.
