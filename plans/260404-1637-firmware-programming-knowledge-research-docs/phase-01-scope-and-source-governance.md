# Phase 01 — Scope và source governance

## Context links
- Scout: `./scout/scout-01-firmware-programming-scope.md`
- Vendor research: `./research/researcher-01-vendor-report.md`
- Community/forum research: `./research/researcher-02-community-forum-report.md`
- Codebase docs: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/codebase-summary.md`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/code-standards.md`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-overview-pdr.md`

## Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-04
- Description: chốt phạm vi linh kiện, taxonomy nguồn, rule citation, và definition-of-claim.
- Priority: P1
- Implementation status: pending
- Review status: not-started

## Key Insights
- Variant drift là rủi ro số 1 (SIM7600 SKU/manual; LIS3DH vs LIS3DSH).
- Nhiều lỗi firmware symptom thực chất do power integrity / sequencing.
- Nếu không khóa source governance sớm, về sau confidence bị nhiễu.

## Requirements
- Xác nhận phạm vi bắt buộc: ESP32-S3, SIM7600/SIM7600CE, LIS3DSH/LIS3DH, W25Q128JV, DS3231M, power IC.
- Định nghĩa taxonomy nguồn: vendor-primary / repo-community / forum.
- Định nghĩa claim classes: critical, supporting, contextual.
- Định nghĩa citation rule: critical claim publish floor = >=1 vendor evidence + >=1 field evidence (community/forum) khi field source tồn tại.
- Conflict governance: khi vendor docs mâu thuẫn community/forum, ưu tiên quyết định Vendor-first.
<!-- Updated: Validation Session 1 - vendor-first precedence + minimum proof floor -->

## Architecture
- Artifact logic:
  1) Source registry
  2) Claim registry
  3) Evidence mapping
  4) Confidence grading
  5) Unresolved question ledger
- Mỗi claim có ID duy nhất: `CLM-<component>-<nnn>`.

## Related code files
- Files to modify: none (planning-only).
- Files to create (future docs target):
  - `iot-vehicle-tracking-system-firmware/hardware-specs/programming/00-overview.md`
  - `iot-vehicle-tracking-system-firmware/hardware-specs/programming/99-citation-index.md`
  - `iot-vehicle-tracking-system-firmware/hardware-specs/programming/98-glossary.md`
- Files to delete: none.

## Implementation Steps
1. Chốt danh sách component + variant cần cover.
2. Chốt taxonomy nguồn và priority order.
3. Định nghĩa schema claim/evidence/confidence/unresolved.
4. Định nghĩa policy conflict resolution vendor vs community.
5. Baseline checklist để qua gate P01.

## Todo list
- [ ] Finalize component/variant inventory.
- [ ] Finalize source governance policy.
- [ ] Finalize claim schema + ID convention.
- [ ] Finalize citation minimum rule cho từng claim class.

## Success Criteria
- Có policy nguồn rõ, không mơ hồ.
- Mọi claim class có rule evidence cụ thể.
- Có template thống nhất cho phase sau sử dụng.

## Risk Assessment
- Risk: thiếu part-number/board variant thực địa.
- Risk: nguồn community không stable theo thời gian.
- Mitigation: khóa snapshot links + ghi thời điểm truy cập.

## Security Considerations
- Không đưa secret/config runtime vào docs programming.
- Không publish hướng dẫn có thể lạm dụng thiết bị ngoài phạm vi hợp pháp.

## Next steps
- Bắt đầu P02 để thu thập evidence thô theo schema đã khóa.