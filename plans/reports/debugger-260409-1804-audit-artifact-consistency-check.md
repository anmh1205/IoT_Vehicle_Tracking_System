# Debug report — audit artifact consistency check

- Timestamp: 2026-04-09 18:04 (Asia/Saigon)
- Scope checked:
  - `plans/260409-1721-thesis-latex-deep-audit-error-mapping/reports/audit-*.md`
  - `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`
  - `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.log`
  - `resources/reports/thesis/final/assets/figures/10-chuong-4-ket-qua-do-luong-hinh-4-38.svg`
- Mode: investigation only, no source edit

## 1) Verdict nhanh theo claim lớn

| Claim lớn | Kết quả | Bằng chứng ngắn |
|---|---|---|
| `88 includes` (`\\safeincludesvg`) | **VERIFIED** | Đếm trực tiếp trong `.tex`: `safeincludesvg = 88` |
| `87 sources` (`Nguồn:`) | **VERIFIED** | Đếm trực tiếp trong `.tex`: `Nguồn: = 87` |
| `1 missing source` gần include | **VERIFIED** | Scan 88 include với cửa sổ +12 dòng: chỉ thiếu tại line `7675` |
| `250 overfull >5pt` | **VERIFIED** | `.log`: `Overfull` tổng `256`, trong đó `>5pt = 250`, `<=5pt = 6` |
| `Max overfull = 910.66318pt` | **VERIFIED** | `.log` có cụm line `1134/1139/1144` báo `910.66318pt` |
| `Underfull tổng = 31` | **VERIFIED** | Đếm trực tiếp `.log`: `Underfull \hbox = 31` |
| AST-001 critical chain (`tex -> log -> svg`) | **VERIFIED** | `.tex` line `10548-10554` include/caption/source; `.log` line `2604-2606` load asset PDF; `.svg` line 1 có `Syntax error in text` + `aria-roledescription="error"` |

## 2) Xác nhận chain AST-001 (3 nguồn)

- TEX anchor: `99-bao-cao-thesis-hoan-chinh-latex.tex:10548` include file `10-chuong-4-ket-qua-do-luong-hinh-4-38.svg`, caption hình 4.47 và source line ở `10554`.
- LOG anchor: `99-bao-cao-thesis-hoan-chinh-latex.log:2604-2606` nạp `./svg-inkscape/10-chuong-4-ket-qua-do-luong-hinh-4-38_svg-raw.pdf`.
- SVG anchor: `.../10-chuong-4-ket-qua-do-luong-hinh-4-38.svg:1` chứa literal `Syntax error in text` và marker error.

Kết luận: chain bằng chứng cho AST-001 là mạnh và nhất quán nội bộ.

## 3) Potential false-positive / false-negative nổi bật

### Potential false-positive
1. `CIT-001` (87 source lines chưa có IEEE citation key) có nguy cơ over-flag.
   - Lý do: rulebook có policy “hình tự dựng” khác external source.
   - Hiện scan chỉ đếm mọi `Nguồn:` rồi suy ra thiếu IEEE key, chưa tách self-authored vs external.

2. `AST-002` mô tả “cần đối soát link chain” có bằng chứng yếu hơn AST-001.
   - `.log` đang cho thấy pipeline vẫn tìm được artifact PDF tương ứng; chưa thấy mismatch path rõ ràng.

### Potential false-negative
1. `FIG-001` dùng tiêu chí “Nguồn gần kề include” (window cục bộ).
   - Nếu source line đặt xa hơn chuẩn local window thì có thể bị bỏ sót/đánh nhầm.

2. AST scan hiện tập trung file SVG hình 4.38 theo scope.
   - Không loại trừ SVG khác có marker lỗi tương tự nhưng chưa quét trong vòng này.

## 4) Kết luận tổng

- Các claim số liệu cốt lõi (88/87/1/250/max 910.66318/underfull 31) **nhất quán** giữa artifact audit và dữ liệu gốc `.tex/.log`.
- AST-001 critical chain **được xác nhận chắc** bằng 3 nguồn (`tex/log/svg`).
- Điểm cần siết ở vòng audit sau: tách rule citation theo loại nguồn để giảm false-positive, và làm rõ AST-002 có phải issue thật hay chỉ note đối soát.

## Unresolved questions
- Không có.
