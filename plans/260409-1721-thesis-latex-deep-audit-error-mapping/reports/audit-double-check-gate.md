# Double-check gate protocol (2-pass)

## Objective
Đảm bảo issue chỉ được đóng khi pass cả máy quét và soát tay trọng điểm.

## Pass A — machine/regex-led
1. Quét lại `.tex/.log/.assets` với rulebook hiện tại.
2. Recompute metrics: overfull/underfull, source count, critical asset markers.
3. So khớp với issue list hiện hành.
4. Mark issue state:
   - `open`: còn evidence
   - `candidate-closed`: không còn evidence ở Pass A

## Pass B — manual spot-check
1. Soát hotspot theo thứ tự ưu tiên:
   - Figure 4.47
   - Cover pages
   - Top overfull clusters (>=500pt)
   - Citation/reference sections
2. Kiểm tra visual/logical consistency theo checklist.
3. Chỉ issue nào `candidate-closed` + spot-check pass mới đổi thành `closed`.

## Reconciliation rule
- Nếu A pass nhưng B fail -> issue quay lại `open`.
- Nếu A fail nhưng B pass -> ưu tiên A, giữ `open` và điều tra false-negative manual.

## Exit gate
- `Critical = 0`
- `High = 0`
- `Overfull >5pt = 0`
- Figure lỗi asset đã sạch marker lỗi
- Cover compliance đạt mức gần tuyệt đối

## Evidence log template
| issue_id | pass_a | pass_b | decision | note |
|---|---|---|---|---|
| ISS-xxx | pass/fail | pass/fail | close/reopen | short rationale |

## Unresolved questions
- Không có.
