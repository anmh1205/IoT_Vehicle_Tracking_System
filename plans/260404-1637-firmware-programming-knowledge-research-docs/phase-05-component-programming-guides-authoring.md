# Phase 05 — Biên soạn per-component programming guides

## Context links
- `./phase-04-document-information-architecture.md`
- `./phase-03-cross-validation-matrix-and-confidence.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260404-1637-firmware-programming-knowledge-research-docs/scout/scout-01-firmware-programming-scope.md`

## Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-04
- Description: lập kế hoạch viết chi tiết từng guide component theo evidence đã validate.
- Priority: P2
- Implementation status: pending
- Review status: not-started

## Key Insights
- LIS3DSH/LIS3DH phải tách section “non-interchangeable points”.
- SIM7600 cần ghi rõ khác biệt SIM7600 vs SIM7600CE và version-sensitive commands.
- Power constraints phải nằm trong từng guide, không chỉ playbook.

## Requirements
- Mỗi component guide bắt buộc có: scope, variant map, startup sequencing, runtime constraints, failure signatures, citations.
- Cover đầy đủ: ESP32-S3, SIM7600/SIM7600CE, LIS3DSH/LIS3DH, W25Q128JV, DS3231M, power IC.
- Gắn confidence tag vào claim quan trọng ngay trong guide.
- Claim confidence C bắt buộc gắn warning label + preconditions + link unresolved item.
<!-- Updated: Validation Session 1 - mandatory warning for confidence-C claims -->

## Architecture
- Template per-component:
  1) Part identity + variants
  2) Programming model
  3) Timing/voltage/state constraints
  4) Known pitfalls
  5) Debug checkpoints
  6) Claim-to-evidence references
- Chuẩn label cho cảnh báo: `Critical`, `Variant-sensitive`, `Provisional`.

## Related code files
- Files to modify: none.
- Files to create (future docs target):
  - `.../01-esp32-s3-programming-guide.md`
  - `.../02-sim7600-sim7600ce-programming-guide.md`
  - `.../03-lis3dsh-vs-lis3dh-programming-guide.md`
  - `.../04-w25q128jv-programming-guide.md`
  - `.../05-ds3231m-programming-guide.md`
  - `.../06-power-ic-and-sequencing-guide.md`
- Files to delete: none.

## Implementation Steps
1. Lập outline riêng cho 6 guide.
2. Map claim critical vào từng section.
3. Chèn conflict notes nếu claim confidence B/C.
4. Đảm bảo mọi recommendation có source ref.
5. Review consistency thuật ngữ xuyên guide.

## Todo list
- [ ] Finalize outlines cho 6 guide.
- [ ] Finalize claim mapping table per guide.
- [ ] Finalize warning labels policy.
- [ ] Finalize confidence tag placement.

## Success Criteria
- Không thiếu component bắt buộc.
- Không có claim quan trọng thiếu citation.
- Variant-sensitive points được nêu explicit.

## Risk Assessment
- Risk: viết quá sâu vào implementation-specific code path.
- Risk: copy guideline giữa component làm sai ngữ cảnh.
- Mitigation: giữ guide theo component identity-first.

## Security Considerations
- Chỉ mô tả thực hành an toàn và tuân thủ giới hạn phần cứng; không cung cấp hành vi phá hủy/abuse.

## Next steps
- Sang P06 để lập integration patterns và failure/debug playbook.