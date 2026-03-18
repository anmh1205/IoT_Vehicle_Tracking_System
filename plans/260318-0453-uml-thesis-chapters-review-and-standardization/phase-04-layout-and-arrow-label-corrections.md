# Phase 4: Sửa overlay mũi tên/chữ và tối ưu layout

## 1) Context links
- Foundation:
  - `plans/260318-0453-uml-thesis-chapters-review-and-standardization/phase-01-scope-and-risk-triage.md`
  - `plans/260318-0453-uml-thesis-chapters-review-and-standardization/phase-02-pre-render-standardization-gates.md`
  - `plans/260318-0453-uml-thesis-chapters-review-and-standardization/phase-03-language-and-flow-consistency.md`
- Pipeline:
  - `resources/reports/thesis-chapters/assets/generate-thesis-report-figures.mjs`
  - `resources/reports/thesis-chapters/assets/mermaid-thesis-config.json`

## 2) Overview
- Mục tiêu phase 4: xử lý trực diện lỗi `label overlay` và tăng khả năng đọc của các sơ đồ phức tạp.
- Ưu tiên P0 trước, rồi P1, rồi P2.
- Điều chỉnh theo hướng KISS: ưu tiên 1) spacing, 2) nhãn ngắn, 3) tách edge, 4) thay đổi hướng cục bộ.

## 3) Key Insights
- Nhóm P0 thường vướng do cụm node dày, cạnh song song và nhãn dài.
- Các chỉnh sửa hiệu quả thấp nhất nhưng có tác dụng cao:
  - rút gọn/đặt dòng trong nhãn,
  - tăng `nodeSpacing`/`rankSpacing` trong chart cụm,
  - loại bỏ `parallel edge` trực diện bằng node trung gian.
- Không cần thêm ký thuật phức tạp; giữ đúng scope thesis.

## 4) Requirements
<!-- Updated: Validation Session 1 - allow local direction changes -->
- Không được che nội dung nghiệp vụ gốc.
- Với mỗi file đã sửa, phải có lý do chỉnh sửa ngắn và mức ưu tiên.
- Đảm bảo tên kỹ thuật giữ nguyên.
- **Cho phép đổi `flowchart direction` cục bộ (TD/LR) theo file** nếu giúp giảm overlay, với điều kiện không đổi semantics nghiệp vụ.
- Mọi sửa đều phải có thể revert đơn lẻ theo file.

## 5) Architecture
- Tránh sửa toàn file; chỉnh tại 3 điểm:
  1. `%% init` global nếu cần nhất quán;
  2. dòng edge có rủi ro overlay;
  3. bố cục mini trong subgraph có cấu trúc chồng chéo.
- Có thể chỉnh theo kiểu theo nhóm:
  - Group 1: 09-cloud (hầu hết TB/flow cao).
  - Group 2: 10-kết quả đo lường (chuỗi tương đồng).
  - Group 3: thesis-99 (phụ lục) và 03.
- Mỗi nhóm xử lý trong branch riêng nếu cần revert riêng.

## 6) Related code files
- **Edit trực tiếp:**
  - `resources/reports/thesis-chapters/assets/uml/09-chuong-4-trien-khai-cloud-hinh-4-15.mmd`
  - `resources/reports/thesis-chapters/assets/uml/09-chuong-4-trien-khai-cloud-hinh-4-25.mmd`
  - `resources/reports/thesis-chapters/assets/uml/10-chuong-4-ket-qua-do-luong-hinh-4-20.mmd`
  - `resources/reports/thesis-chapters/assets/uml/10-chuong-4-ket-qua-do-luong-hinh-4-38.mmd`
  - `resources/reports/thesis-chapters/assets/uml/thesis-99-bao-cao-thesis-hoan-chinh-01.mmd`
  - `resources/reports/thesis-chapters/assets/uml/thesis-99-bao-cao-thesis-hoan-chinh-09.mmd`
  - `resources/reports/thesis-chapters/assets/uml/03-chuong-3-giai-phap-phan-cung-hinh-3-1.mmd`
- `resources/reports/thesis-chapters/assets/uml/06-chuong-3-giai-phap-frontend-hinh-3-17.mmd`
- `resources/reports/thesis-chapters/assets/uml/04-chuong-3-giai-phap-firmware-hinh-3-11.mmd`
  - và toàn bộ danh sách P0/P1 đã khóa ở phase 1.

## 7) Implementation Steps
1. Với file P0, mở bản render baseline (SVG hiện có) và highlight vị trí overlay.
2. Áp dụng sửa theo thứ tự:
   - chỉnh layout direction/local subgraph trước khi touch label;
   - tách nhãn quá dài;
   - loại bỏ cạnh song song trực diện.
3. Nếu cần, thêm/sửa block init phù hợp cho nhóm diagram có mật độ cạnh cao.
4. Đảm bảo độ bám nội dung: không đổi ý nghĩa luồng.
5. Render thử 1-2 file trước nhóm, rồi nhân rộng nếu ổn.
6. Sau mỗi nhóm, update trạng thái file trong `reports/planner-report.md`.

## 8) Todo list
- [ ] Thiết lập baseline trước-sửa của ít nhất 5 file P0.
- [ ] Sửa tay `09-*` theo checklist overlay.
- [ ] Sửa tay `10-*` theo checklist overlay.
- [ ] Sửa tay `thesis-99-*` theo checklist overlay.
- [ ] Sửa tay `03-*` nếu phát hiện label/edge overlay còn sót.
- [ ] Sửa `04-*`, `05-*`, `06-*` theo nhóm nhỏ P1.
- [ ] Chuyển danh mục P2 sau khi P0/P1 clear.

## 9) Success Criteria
- Không còn lỗi “nhãn đâm xuyên mũi tên” trong các file P0/P1 được xác nhận.
- Tỷ lệ chồng chéo cảnh báo thấp hơn baseline theo ghi nhận visual QA.
- Số sửa/1,000 ký tự giảm so với thử nghiệm đầu.
- Mỗi file sửa được gắn note lý do với 1 dòng.

## 10) Risk Assessment
- Quá bận chỉnh giao diện dễ làm sai flow (nhãn ngắn hóa quá mức).
- Chỉnh layout quá mạnh có thể làm tổng quan thesis bị khác so với thuyết trình.
- Hai nhánh song song nếu chồng file có thể tạo xung đột nội dung.

## 11) Security Considerations
- Không đổi nhãn theo hướng thêm dữ liệu không cần thiết.
- Không chèn đường dẫn ngoài project trong script note.
- Không dùng external asset/tool sửa trực tiếp file qua web.

## 12) Next steps
- Khi clear P0/P1, chuyển sang phase 5.
- Nếu còn lỗi overlay cục bộ, quay lại phase 2 precheck để tăng rule nghiêm ngặt.
- Unresolved questions: có cho phép thay đổi direction trong một số `flowchart` cho đẹp đọc mặc dù thay đổi orientation ban đầu?