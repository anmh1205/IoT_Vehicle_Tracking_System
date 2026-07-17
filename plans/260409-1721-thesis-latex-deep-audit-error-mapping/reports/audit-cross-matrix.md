# Cross-matrix `.tex/.log/.assets`

| Issue ID | Rule | tex_ref | log_ref | asset_ref | Summary | Severity |
|---|---|---|---|---|---|---|
| ISS-001 | FIG-SRC-02 | tex:7677 | - | `thesis-08-chuong-4-trien-khai-firmware-01.svg` (context) | Caption Hình 4.17 không có nguồn kề sau | High |
| ISS-002 | AST-SVG-01 | tex:10548-10555 | log:2604-2606 | `10-chuong-4-ket-qua-do-luong-hinh-4-38.svg` | Asset Figure 4.47 render lỗi literal | Critical |
| ISS-003 | AST-SVG-01 | tex:10548-10555 | log:2604-2606 | `10-chuong-4-ket-qua-do-luong-hinh-4-38.svg` | Chain tex/log/asset xác nhận lỗi Figure 4.47 đã đi vào bản biên dịch | Critical |
| ISS-004 | CIT-IEEE-01 | whole tex scan | - | - | Không có macro citation framework | Critical |
| ISS-005 | FIG-SRC-01 | 87 line `Nguồn:` (vd tex:965, 10554, 12763) | - | - | Nguồn thủ công dày đặc, conflict policy self-authored | High |
| ISS-006 | FIG-QTE-01 | tex:9195, 10407, 12532, 12736, 13068 | - | - | Quote block dùng cho ghi chú/lưu ý, gây nhiễu audit nguồn hình | Medium |
| ISS-007 | LAY-OVR-01 | tex ranges từ log map | log:843..2983 | - | Overfull 256; `>5pt` = 250 | High |
| ISS-008 | LAY-OVR-01 | tex:2361-2397; 11067-11109; 3238-3257 | log:1134-1144; 2775-2785; 1260-1270 | - | Overfull cực lớn (910/857/754pt) | High |
| ISS-009 | LAY-UND-01 | tex:4213-4222; 7396-7404; 10923-10931... | log:1394,1400,2025,2031,2038,2670... | - | Underfull 31, một số cụm badness 10000 | Medium |
| ISS-010 | LAY-COVER-01 | tex:140-197 | - | template tex:0+ | Cover thesis giản lược, template dùng layout tọa độ chi tiết | High |

## Matrix notes
- `ISS-002` là issue có đầy đủ chain 3 nguồn (tex/log/assets), ưu tiên xác nhận đầu tiên.
- `ISS-006` và `ISS-007` là cùng rule nhưng tách để phân biệt “widespread” và “extreme outlier”.

## Unresolved questions
- Cover compliance đánh theo visual pixel-level hay theo semantic block-level ở vòng sửa kế tiếp?
