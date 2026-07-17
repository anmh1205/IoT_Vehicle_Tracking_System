# Handoff + Definition of Ready (DoR)

## Handoff package (đã sẵn sàng)
- `audit-rulebook-thesis-latex.md`
- `audit-raw-line-index.md`
- `audit-raw-issues.md`
- `audit-cross-matrix.md`
- `audit-severity-triage.md`
- `audit-pass-fail-checklist.md`
- `audit-double-check-gate.md`
- `audit-prioritized-fix-queue.md`

## DoR for implementation round

### Must-have inputs
- [x] Rulebook khóa policy IEEE + self-authored + overfull gate
- [x] Issue IDs ổn định và có cross-matrix
- [x] Priority queue có dependency rõ
- [x] Gate protocol 2-pass có tiêu chí close/reopen

### Ready criteria
- [x] Có danh sách must-fix trước nộp
- [x] Có anchor line-number cho các issue critical/high
- [x] Có tiêu chí nghiệm thu hậu-fix (critical/high = 0)
- [x] Có unresolved questions được tách riêng

## Constraints for next round
- Không mở rộng scope sang refactor template toàn luận văn nếu chưa cần.
- Ưu tiên fix theo queue, không xử lý lan man.
- Mỗi fix batch phải re-run gate A trước khi qua gate B.

## Unresolved questions
- Không có.
