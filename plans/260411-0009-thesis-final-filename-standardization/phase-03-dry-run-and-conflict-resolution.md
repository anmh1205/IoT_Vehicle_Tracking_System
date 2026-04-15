# Context Links
- Root plan: `./plan.md`
- Phase 01: `./phase-01-inventory-and-naming-freeze.md`
- Phase 02: `./phase-02-dependency-scan-and-manifest-design.md`

# Overview
- Priority: P1
- Status: pending
- Brief: Mô phỏng rename end-to-end, phát hiện conflict trước khi đụng file thật.

# Key Insights
- Dry-run fail sớm rẻ hơn rollback sau rename thật.
- Trên win32 phải check collision case-insensitive.
- Zero-hit replacement trong `.md/.tex` là tín hiệu mapping sai hoặc thiếu scan.

# Requirements
- Functional:
  - Sinh báo cáo dry-run: tổng số rename, conflict, unresolved refs, zero-hit.
  - Áp stop criteria cứng trước khi cho phép phase 4.
  - Chốt conflict resolution quyết định rõ cho từng record.
- Non-functional:
  - Không mutate file thật trong phase này.
  - Output reviewable, có trace theo `manifest.id`.

# Architecture
- Input: rename-manifest (phase 2).
- Dry-run engine checks:
  1) Path conflict.
  2) Reference replace simulation.
  3) Mermaid mapping coverage.
  4) Artifact drift detection.
- Output: dry-run report + approved execution manifest.

# Related Code Files
- Modify (kế hoạch): none
- Create (kế hoạch):
  - `resources/reports/thesis/final/assets/rename-manifest-approved.json`
  - `resources/reports/thesis/final/assets/rename-dry-run-report.md`
- Delete (kế hoạch): none

# Implementation Steps
1. Nạp manifest và normalize path key (POSIX + lower-case key phụ cho Windows check).
2. Check A: duplicate `new_path` (exact).
3. Check B: duplicate `new_path` theo case-insensitive.
4. Check C: `new_path` đã tồn tại nhưng không thuộc replace-safe set.
5. Check D: simulate replace token trong `.md/.tex/.mjs` -> thống kê hit count.
6. Check E: với record `.mmd`, verify `.svg` mirror và mapping lookup hợp lệ.
7. Check F: detect legacy artifact drift (`thesis-build.*` vs canonical basename).
8. Xuất report; block nếu bất kỳ stop criteria vi phạm.
9. Resolve conflict từng record; regen manifest-approved.

# Todo List
- [ ] Run all dry-run checks A-F.
- [ ] Produce dry-run report with counts and record IDs.
- [ ] Resolve all conflicts and regenerate approved manifest.
- [ ] Gate phase 4 only when all stop criteria pass.

# Success Criteria
- `conflicts = 0`
- `unresolved_refs = 0`
- `missing_mermaid_mapping = 0`
- `legacy_output_drift = 0`
- `zero_hit_replacements = 0` (hoặc được giải thích và approved)

# Risk Assessment
- Rủi ro: bỏ qua collision case-only -> rename fail giữa chừng trên Windows.
- Mitigation: bắt buộc check B và cấm apply nếu còn collision.

# Security Considerations
- Dry-run không ghi đè file.
- Không chạy command destructive trước khi checklist pass.

# Next Steps
- Sang phase 4 để apply rename theo manifest-approved.

## Dry-run procedure details
| Check | Mục tiêu | Dữ liệu | Stop criteria |
|---|---|---|---|
| A | Trùng đích exact | `new_path` | `>0` duplicate |
| B | Trùng đích case-insensitive | `lower(new_path)` | `>0` duplicate |
| C | Đụng file sẵn có ngoài map | filesystem + manifest | `>0` overwrite-unsafe |
| D | Simulate ref replacement | `.md/.tex/.mjs` | `zero-hit` không giải thích |
| E | Mermaid/source-output consistency | `.mmd/.svg` mapping | thiếu mirror/map |
| F | Build basename drift | artifact list | còn `thesis-build.*` khi không canonical |

## Conflict resolution policy
1. One-to-many hoặc many-to-one target: bắt buộc đổi tên target để unique.
2. Case-only rename: tách thành rename trung gian tạm rồi rename đích.
3. Overwrite-unsafe: đổi target hoặc đánh dấu manual review.
4. Zero-hit replacement: quay lại phase 2 quét touchpoint bổ sung, không bypass.
