# Duplicate-risk audit - thesis figures/tables

- Thời điểm: 2026-04-11 03:17 Asia/Saigon
- Phạm vi: `resources/reports/thesis/final/thesis-final-report.tex` + `resources/reports/thesis/final/assets/**`
- Cách rà: grep caption/macro/ref + liệt kê assets. Chỉ audit rủi ro, không sửa.

## Kết luận ngắn

1. Rủi ro lớn nhất không nằm ở 1 file ảnh trùng tuyệt đối đã xác nhận, mà ở mô hình đặt caption thủ công bằng macro. Nó làm Chương 3/4 rất dễ có caption trùng nghĩa, số hình/bảng lệch, và không có anchor ổn định để truy vết.
2. Thư mục `assets/` đang chứa cả source render, config, template PDF, schematic gốc, netlist. Tên nhiều file tự mô tả tốt, nhưng vẫn có nhóm mơ hồ/orphan tiềm năng.
3. Rename hoặc reorder assets có thể làm vỡ pipeline render Mermaid/LaTeX vì naming hiện đang encode số chương/số hình vào chính filename.

## 1) Duplicate image usage hoặc caption trùng nghĩa giữa Chương 3/4

### Quan sát chắc chắn
- Caption hình/bảng trong `.tex` không gắn trực tiếp với `figure/table` float chuẩn mà dùng macro tự tăng counter:
  - `resources/reports/thesis/final/thesis-final-report.tex:206`
  - `resources/reports/thesis/final/thesis-final-report.tex:209`
- Ví dụ caption được viết tay theo literal text, không có `\label`/`\ref` đi cùng caption:
  - `resources/reports/thesis/final/thesis-final-report.tex:1014` (`Hình 1.1: ...`)
  - `resources/reports/thesis/final/thesis-final-report.tex:1154` (`Bảng 1.1: ...`)

### Candidate trùng nghĩa Ch3/Ch4
- Cặp design vs implementation rất dễ bị lặp semantic giữa Chương 3 và 4 vì naming assets gần đối xứng:
  - Ch3 backend: `resources/reports/thesis/final/assets/uml/05-chuong-3-giai-phap-backend-hinh-3-12.mmd`
  - Ch4 cloud: `resources/reports/thesis/final/assets/uml/09-chuong-4-trien-khai-cloud-hinh-4-16.mmd`
  - Nhóm này nhiều khả năng cùng mô tả luồng backend/cloud ở 2 mức khác nhau; nếu caption không phân biệt rõ “thiết kế” vs “triển khai thực tế” thì trùng nghĩa.
- Cặp frontend flow Ch3 vs kết quả/luồng UI Ch4 cũng có nguy cơ tương tự:
  - `resources/reports/thesis/final/assets/uml/06-chuong-3-giai-phap-frontend-hinh-3-15.mmd`
  - `resources/reports/thesis/final/assets/uml/10-chuong-4-ket-qua-do-luong-hinh-4-21.mmd`
- Cặp hardware architecture Ch3 vs hardware deployment Ch4:
  - `resources/reports/thesis/final/assets/uml/03-chuong-3-giai-phap-phan-cung-hinh-3-1.mmd`
  - `resources/reports/thesis/final/assets/uml/07-chuong-4-trien-khai-hardware-hinh-4-1.mmd`

### Dấu hiệu vận hành gây duplicate khó phát hiện
- Markdown build trung gian map caption -> file hình theo numbering chương/hình, ví dụ:
  - `resources/reports/thesis/final/thesis-final-report.md:1086`
  - `resources/reports/thesis/final/thesis-final-report.md:1092`
  - `resources/reports/thesis/final/thesis-final-report.md:1265`
- Vì caption là text literal, chỉ cần đổi wording nhẹ là duplicate semantic sẽ không bị tool nào bắt.

## 2) Orphan asset hoặc asset không tự mô tả

### Có vẻ orphan / không trực tiếp là output hình final
- Template PDF nằm cùng thư mục assets nhưng không tự nói rõ vai trò trong pipeline hình:
  - `resources/reports/thesis/final/assets/template-cover-page-1.pdf`
  - `resources/reports/thesis/final/assets/template-cover-pages-1-2.pdf`
- Schematic raw + netlist gốc nằm cạnh pipeline render thesis:
  - `resources/reports/thesis/final/assets/schematic/iot-vehicle-tracking-system-main.pdf`
  - `resources/reports/thesis/final/assets/schematic/iot-vehicle-tracking-system-main-netlist.NET`
- Nếu `.NET` không được thesis hoặc script render tham chiếu, đây gần như orphan từ góc nhìn thesis final.

### Asset tên chưa đủ tự mô tả
- Các tên kiểu `diagram-01/02/03/04` không nói nội dung business/domain:
  - `resources/reports/thesis/final/assets/uml/05-chuong-3-giai-phap-backend-diagram-01.mmd`
  - `resources/reports/thesis/final/assets/uml/05-chuong-3-giai-phap-backend-diagram-02.mmd`
  - `resources/reports/thesis/final/assets/uml/05-chuong-3-giai-phap-backend-diagram-03.mmd`
  - `resources/reports/thesis/final/assets/uml/05-chuong-3-giai-phap-backend-diagram-04.mmd`
- Hậu quả: khó audit trùng nghĩa, khó biết file nào safe để rename, dễ nhầm source phụ với figure chính.

## 3) Vấn đề do dùng `\thesisfigurecaption` và `\thesistabletitle`

### Vấn đề kỹ thuật
- `\thesisfigurecaption` chỉ tăng `figure` counter và in đậm text, không tạo float/anchor/ref chuẩn:
  - `resources/reports/thesis/final/thesis-final-report.tex:206`
- `\thesistabletitle` làm tương tự cho bảng:
  - `resources/reports/thesis/final/thesis-final-report.tex:209`
- Có `\label`/`\ref` trong file, nhưng grep chỉ cho thấy label/ref dùng cho heading và tài liệu tham khảo, không chứng minh được figure/table đang có hệ thống cross-ref ổn định:
  - `resources/reports/thesis/final/thesis-final-report.tex:214`
  - `resources/reports/thesis/final/thesis-final-report.tex:216`

### Hệ quả
- Không có liên kết chặt giữa caption và asset cụ thể.
- Không có `\label` sát caption hình/bảng => khó rename/reorder mà vẫn đảm bảo “Hình 3.x/Bảng 4.x” đúng logic.
- List of figures/tables có thể vẫn sinh ra, nhưng audit tự động duplicate/orphan/ref integrity yếu hơn nhiều so với float chuẩn.
- Khi Ch3 là “giải pháp” và Ch4 là “triển khai/kết quả”, caption rất dễ lặp nghĩa vì không có cấu trúc bắt buộc phân biệt loại hình.

## 4) Rủi ro khi rename/sắp xếp lại assets và dependency với pipeline render

### Dependency nhìn thấy từ cấu trúc thư mục
- Pipeline assets có script/config riêng:
  - `resources/reports/thesis/final/assets/generate-thesis-report-figures.mjs`
  - `resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs`
  - `resources/reports/thesis/final/assets/mermaid-thesis-config.json`
- Source Mermaid nằm ở `resources/reports/thesis/final/assets/uml/*.mmd`
- Output final nằm ở `resources/reports/thesis/final/assets/figures/*.(svg|png)`

### Rủi ro cụ thể
- Filename đang encode chương + section + số hình (`03-chuong-3-...-hinh-3-1.mmd`). Rename sẽ dễ làm lệch mapping source->output->caption.
- Reorder hình trong thesis nhưng không rename asset tương ứng sẽ làm tên file và số hình trong caption mâu thuẫn.
- Rename file `.mmd` mà script còn hardcode/glob theo prefix hiện tại sẽ làm mất render output hoặc output sai tên.
- Xóa “asset tưởng orphan” như template PDF hoặc schematic raw có thể làm vỡ bước build phụ/tài liệu đính kèm nếu pipeline ngoài `.tex` còn dùng.
- Nếu pipeline dùng fallback `.png/.pdf` qua macro includegraphics, rename 1 định dạng nhưng quên định dạng còn lại sẽ gây lỗi silent hoặc dùng nhầm bản cũ:
  - `resources/reports/thesis/final/thesis-final-report.tex:121`
  - `resources/reports/thesis/final/thesis-final-report.tex:124`
  - `resources/reports/thesis/final/thesis-final-report.tex:135`
  - `resources/reports/thesis/final/thesis-final-report.tex:138`

## Khuyến nghị ngắn
- Audit theo semantic pair Ch3 “giải pháp” vs Ch4 “triển khai/kết quả”, không chỉ theo filename giống nhau.
- Trước khi rename assets: lập bảng map `caption -> source .mmd -> output .svg/.png -> dòng .tex/.md`.
- Đánh dấu riêng nhóm non-figure assets: template PDF, schematic raw, netlist.
- Ưu tiên đổi tên các file `diagram-0x` sang tên tự mô tả trước; đừng reorder hàng loạt khi chưa biết script map thế nào.

## Unresolved questions
- Chưa xác nhận được bằng grep hiện tại file `.tex` tham chiếu trực tiếp từng asset nào ở Chương 3/4 theo từng dòng caption.
- Chưa xác nhận `generate-thesis-report-figures.mjs` có hardcode filename/prefix hay chỉ glob động.
- Chưa xác nhận `.NET` netlist và 2 template PDF có được pipeline build final dùng hay chỉ lưu kèm.