# Raw issues (candidate set)

## Candidate list

| Issue ID | Rule | Evidence | Initial severity |
|---|---|---|---|
| ISS-001 | FIG-SRC-02 | `Hình 4.17` có caption tại tex:7677 nhưng không có dòng nguồn ngay sau caption | High |
| ISS-002 | AST-SVG-01 | SVG `10-chuong-4-ket-qua-do-luong-hinh-4-38.svg` chứa `Syntax error in text` | Critical |
| ISS-003 | AST-SVG-01 | Figure 4.47 link chain tex:10548 ↔ log:2604-2606 ↔ asset lỗi | Critical |
| ISS-004 | CIT-IEEE-01 | Không phát hiện macro citation (`\cite`, `\parencite`, `\textcite`) trong tex | Critical |
| ISS-005 | FIG-SRC-01 | 87 dòng `Nguồn:` trong khi policy self-authored = không ghi nguồn | High |
| ISS-006 | FIG-QTE-01 | Có quote block không phải nguồn: tex:9195, 10407, 12532, 12736, 13068 | Medium |
| ISS-007 | LAY-OVR-01 | Overfull tổng 256; trong đó 250 trường hợp `>5pt` | High |
| ISS-008 | LAY-OVR-01 | Overfull cực lớn (`>=500pt`) xuất hiện 24 lần | High |
| ISS-009 | LAY-UND-01 | Underfull 31 trường hợp, tập trung nhiều cụm đoạn văn | Medium |
| ISS-010 | LAY-COVER-01 | Cover hiện tại là block center đơn giản (tex đầu file), chưa khớp template tuyệt đối (template dùng layout tikz tọa độ) | High |

## Top hotspots to fix first (by blast radius)
1. ISS-004 (citation framework absent)
2. ISS-002/003 (Figure 4.47 asset broken)
3. ISS-007/008 (overfull >5pt widespread)
4. ISS-005 (source policy conflict)
5. ISS-010 (cover compliance)

## Unresolved questions
- ISS-005 cần confirm cuối: có giữ một số dòng nguồn cho hình “dựa trên dữ liệu đo” hay bỏ toàn bộ theo policy self-authored đã khóa?
