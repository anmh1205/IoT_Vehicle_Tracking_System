# Thesis Hardware Error Catalog

## Summary
- Scope scan: abstract + Chương 3 + Chương 4 + phụ lục BOM.
- Priority fix: High/Medium đã xử lý trong file tex.

| id | line-range | issue-type | current-text (before) | rewrite-direction | status |
|---|---|---|---|---|---|
| HW-001 | `L526-L537`, `L581-L594` | architecture-mismatch | Mô tả cứng chưa nhấn mạnh board custom tích hợp | Viết lại mở đầu hardware theo PCB custom + danh sách linh kiện tích hợp | fixed |
| HW-002 | `L2330-L2354` | terminology | “kiến trúc module”, “các module cần thiết” trong phần hardware | Đổi sang “khối chức năng/khối phần cứng” | fixed |
| HW-003 | `L2672`, `L2801` | terminology | Heading “Thiết kế mô-đun ...” ở mục hardware | Đổi heading thành “Thiết kế khối ...” | fixed |
| HW-004 | `L2570-L2572`, `L2590-L2595` | terminology | “Số module phần cứng ...”, “GNSS chung module” | Đổi sang “khối phần cứng rời/khối tích hợp” | fixed |
| HW-005 | `L2144` | terminology | “tọa độ từ module GNSS” | Đổi “khối GNSS tích hợp” | fixed |
| HW-006 | `L5671-L5672` | terminology | “giảm số lượng module phần cứng” | Đổi “giảm số lượng khối phần cứng rời” | fixed |
| HW-007 | `L2328-L2331` | consistency-gap | Chưa có glossary tách nghĩa module software/hardware | Thêm quy ước thuật ngữ đầu phần hardware | fixed |
| HW-008 | `L2906-L2907`, `L6038`, `L3154`, `L6331`, `L6226-L6231` | part-name-mismatch | Còn sót định danh XL1509 trong heading/BOM/enclosure text | Đồng bộ về AP2112-3.3 theo netlist U3 | fixed |
| HW-009 | `L3161-L3165`, `L6338-L6342`, `L12077-L12079` | part-proof-specificity | Định danh LM393/1N5822 trong BOM trong khi netlist xác nhận rõ SS54/SS34 và net-level LVD | Đổi thành khối LVD + diode Schottky (SS54/SS34) để khớp chứng cứ | fixed |
| HW-010 | `L3024`, `L3813-L3818`, `L6179`, `L6747`, `L11347-L11349` | narrative-consistency | Mô tả LVD dùng comparator LM393 trực tiếp tại nhiều đoạn | Chuyển wording sang “khối LVD phần cứng/khối LVD + ADC” | fixed |

## Quick post-fix checks
- Không còn match: `kiến trúc module`, `module phần cứng`, `mô-đun ...` trong các heading hardware đã sửa.
- Không còn match trực tiếp trong thesis tex: `XL1509`, `LM393`, `1N5822`.
- Đã đồng bộ các cụm liên quan theo bằng chứng: `AP2112-3.3`, `SS54/SS34`, `khối LVD phần cứng`.
- Các cụm module ở firmware/software giữ nguyên vì đúng ngữ cảnh.

## Unresolved questions
- Các tài liệu tham khảo [65]-[67] (TPS2115A/IRLML6402/SRD relay) hiện không dùng để chứng minh mạch chính; có cần dọn trong vòng chỉnh sửa citation riêng?