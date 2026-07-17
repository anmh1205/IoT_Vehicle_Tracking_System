# Pass/Fail checklist — thesis LaTeX deep audit

## Global summary

| Group | Status | Evidence |
|---|---|---|
| Citation IEEE framework | FAIL | Không phát hiện macro citation trong tex |
| Figure asset integrity | FAIL | Figure 4.47 asset chứa `Syntax error in text` |
| Figure source policy | FAIL | 87 dòng `Nguồn:` conflict policy self-authored |
| Layout overfull gate (>5pt) | FAIL | 250 overfull >5pt |
| Layout underfull hygiene | FAIL | 31 underfull |
| Cover compliance | FAIL | Cover hiện tại chưa đạt mức khớp gần tuyệt đối template |

## Detailed checks

| Check ID | Condition | Result | Evidence |
|---|---|---|---|
| CHK-CIT-01 | Có cơ chế IEEE citation thống nhất | FAIL | tex scan: không có `\cite`/`\parencite`/`\textcite` |
| CHK-FIG-01 | Mỗi hình có caption `Hình x.y` | PASS | 88 caption / 88 `\safeincludesvg` |
| CHK-FIG-02 | Hình tự dựng không có `Nguồn:` | FAIL | 87 line `Nguồn:` |
| CHK-FIG-03 | Hình lỗi đã được bắt qua chain 3 nguồn | FAIL | tex:10548-10555 ↔ log:2604-2606 ↔ SVG literal error |
| CHK-LAY-01 | Overfull `>5pt` bằng 0 | FAIL | 250 cases |
| CHK-LAY-02 | Underfull nằm dưới ngưỡng kiểm soát | FAIL | 31 cases |
| CHK-COVER-01 | Cover khớp gần tuyệt đối template | FAIL | So sánh cấu trúc cover hiện tại vs template |

## Gate decision
- **Current gate: FAIL**
- Điều kiện chuyển PASS:
  1. Critical = 0
  2. High = 0
  3. Overfull >5pt = 0
  4. Figure 4.47 asset lỗi được thay/regen sạch
  5. Cover đạt tiêu chí compliance đã chốt

## Unresolved questions
- Không có.
