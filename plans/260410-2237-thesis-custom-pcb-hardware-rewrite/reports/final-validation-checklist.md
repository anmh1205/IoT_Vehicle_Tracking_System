# Final Validation Checklist (Hardware Rewrite)

## 1) Terminology sweep
- [x] Thêm glossary phần hardware: dùng “khối phần cứng/khối chức năng”, tách khỏi module software.
- [x] Đổi các heading hardware “mô-đun” -> “khối”.
- [x] Đổi các cụm “module phần cứng” -> “khối phần cứng rời/khối tích hợp”.

## 2) Figure/Table/Caption sweep
- [x] Không đổi mã hình/caption chính (3.x, 4.x) để tránh vỡ tham chiếu.
- [x] Nội dung text xung quanh Hình 3.1/4.1/4.6 đã đồng bộ hướng custom PCB.

## 3) Claim-evidence sweep
- [x] Claim thành phần chính đối chiếu netlist U1..U10.
- [x] Claim power architecture đối chiếu U1/U2/U3/U4/U5.
- [x] Claim OBD2 adapter ngoại vi tách khỏi PCB chính.
- [x] Claim GNSS tích hợp trong modem SIM7600CE-T.
- [x] Reconcile mismatch hậu-review: bỏ claim part-name cũ (`XL1509/LM393/1N5822`) và đồng bộ AP2112 + SS54/SS34 + wording `khối LVD`.

## 4) Build/compile check
- [x] `latexmk -xelatex -interaction=nonstopmode -halt-on-error` chạy thành công.
- [x] Kết quả: `Latexmk: All targets ... are up-to-date`.

## 5) Runtime sanity (session preference)
- [x] Docker status recheck sau chỉnh sửa: các container tracking-* đều `Up` và phần lớn `healthy`.

## 6) Main changed anchors
- `99-bao-cao-thesis-hoan-chinh-latex.tex:L526-L537`
- `99-bao-cao-thesis-hoan-chinh-latex.tex:L582-L595`
- `99-bao-cao-thesis-hoan-chinh-latex.tex:L2328-L2331`
- `99-bao-cao-thesis-hoan-chinh-latex.tex:L2672`
- `99-bao-cao-thesis-hoan-chinh-latex.tex:L2801`
- `99-bao-cao-thesis-hoan-chinh-latex.tex:L2575-L2600`
- `99-bao-cao-thesis-hoan-chinh-latex.tex:L5671-L5677`
- `99-bao-cao-thesis-hoan-chinh-latex.tex:L2906-L2907`, `L6038`
- `99-bao-cao-thesis-hoan-chinh-latex.tex:L3154`, `L6331`
- `99-bao-cao-thesis-hoan-chinh-latex.tex:L3161-L3165`, `L6338-L6342`
- `99-bao-cao-thesis-hoan-chinh-latex.tex:L3024`, `L3813-L3818`, `L6179`, `L6747`
- `99-bao-cao-thesis-hoan-chinh-latex.tex:L6226-L6231`
- `99-bao-cao-thesis-hoan-chinh-latex.tex:L12077-L12079`

## Unresolved questions
- Có cần sweep citation để loại bỏ reference phần cứng không còn dùng trực tiếp ([65]-[67]) ở vòng chỉnh sửa kế tiếp?
- Có cần thay nhãn `\label{...xl1509...}` ở các heading đã đổi thành AP2112-3.3 hay giữ nguyên để tránh ảnh hưởng tham chiếu nội bộ?