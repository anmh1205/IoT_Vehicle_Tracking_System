# Phase 2: Chuẩn hóa tiền-render (cú pháp, label, edge và consistency cơ bản)

## 1) Context links
- Research input:
  - `plans/260318-0453-uml-thesis-chapters-review-and-standardization/research/researcher-01-report.md`
  - `plans/260318-0453-uml-thesis-chapters-review-and-standardization/research/researcher-02-report.md`
- Render pipeline:
  - `resources/reports/thesis-chapters/assets/generate-thesis-report-figures.mjs`
  - `resources/reports/thesis-chapters/assets/thesis-mermaid-diagrams.mjs`
  - `resources/reports/thesis-chapters/assets/mermaid-thesis-config.json`
- Data scope:
  - `resources/reports/thesis-chapters/assets/uml/*.mmd`
  - `resources/reports/thesis-chapters/assets/figures/*`

## 2) Overview
- Mục tiêu phase 2 là khóa lại “hình dạng” trước render để giảm lỗi đè nhãn.
- Tiền đề: không đổi nghiệp vụ, chỉ chuẩn hóa biểu đạt hiển thị.
- Đầu ra: bộ checklist static pass/fail + danh sách sửa thủ công bắt buộc trước khi render.

## 3) Key Insights
- Layout đè nhãn thường xuất hiện do:
  - label dài, label có ký tự đặc biệt / `|` gây sai parse;
  - cạnh song song cùng cặp node;
  - config render chưa đồng nhất giữa các file.
- Với số lượng file lớn, chỉ chạy thủ công toàn bộ là tốn thời gian, cần phân lớp gate tự động + sửa tay có trọng số.
- Có thể giữ `flowchart` hiện có nhưng cần chuẩn hóa tham số chung trong `mermaid-thesis-config.json` và kiểm soát override theo file đặc thù.

## 4) Requirements
<!-- Updated: Validation Session 1 - lock max edge-label length to 24 chars -->
- Chuẩn hóa cú pháp edge và label ở mức tối thiểu:
  - **bắt buộc** nhãn edge > 24 ký tự phải tách dòng theo quy tắc ngắt dòng `\n` hoặc rút gọn theo cụm nghĩa;
  - tránh dùng `|` trong text label không escape.
- Kiểm tra static trước render:
  - duplicate edge (cùng source-target, nhiều edge)
  - self-loop, back-edge gây giao cắt dày.
- Không chỉnh logic nghiệp vụ; chỉ sửa readability.
- Có thể áp dụng theo batch để giảm thay đổi không kiểm soát.

## 5) Architecture
- Stage 1: static audit script chạy trên tất cả `.mmd`.
- Stage 2: fix tự động cho pattern an toàn (chuẩn hóa label length/escape cơ bản).
- Stage 3: fix thủ công cho P0/P1 theo chỉ định Phase 1.
- Stage 4: commit theo nhóm file rõ ràng để reviewer dễ track.

## 6) Related code files
- **Read/verify:**
  - `resources/reports/thesis-chapters/assets/uml/README.md`
  - `resources/reports/thesis-chapters/assets/mermaid-thesis-config.json`
  - `resources/reports/thesis-chapters/assets/thesis-mermaid-diagrams.mjs`
  - `resources/reports/thesis-chapters/assets/generate-thesis-report-figures.mjs`
- **Update (theo kế hoạch):**
  - `resources/reports/thesis-chapters/assets/generate-thesis-report-figures.mjs` (nếu khóa pipeline cần bổ sung log/checksum)
  - `resources/reports/thesis-chapters/assets/thesis-mermaid-diagrams.mjs` (nếu cần chuẩn hóa preload, không đổi content)
  - `resources/reports/thesis-chapters/assets/mermaid-thesis-config.json` (thêm/điều chỉnh flowchart defaults)
- **UML source to edit:**
  - Nhóm P0/P1 trước, sau đó P2.

## 7) Implementation Steps
1. Soạn bộ `precheck` quy tắc:
   - regex label > 24 ký tự -> gợi ý chia dòng;
   - label chứa `|` không escaped -> đánh cờ;
   - cảnh báo edge duplicate `(A,B)`.
2. Chạy scan toàn bộ: xuất `uml-gate-report.md` có `file`, `vi phạm`, `độ ưu tiên`.
3. Chuẩn hóa config Mermaid:
   - khóa `flowchart.nodeSpacing/rankSpacing/wrappingWidth/curve/htmlLabels` theo chuẩn chung;
   - giữ `fontSize` nhất quán để không đổi tỷ lệ toàn chương.
4. Cập nhật template hướng dẫn chỉnh thủ công:
   - rule1: split label >24 ký tự theo cụm ý nghĩa;
   - rule2: ưu tiên `edgeStyle` nhẹ + avoid edge overlap;
   - rule3: nếu duplicate-edge nhiều, dùng node trung gian `..` hoặc đổi hướng.
5. Chạy vòng sửa tay P0, sau đó P1.
6. Re-run precheck và chỉ chuyển sang phase 3/4 sau khi không còn fail mức P1 trong nhóm.

## 8) Todo list
- [ ] Viết/checklist precheck với các rule: label-length, duplicate-edge, forbidden chars.
- [ ] Xác nhận và khóa baseline Mermaid config.
- [ ] Tạo danh sách file cần sửa tay theo mức ưu tiên.
- [ ] Hoàn thành sửa tay P0 trước.
- [ ] Hoàn thành sửa tay P1 trước khi sang P2.
- [ ] Chuẩn bị handoff cho Phase 4 với log thay đổi chi tiết.

## 9) Success Criteria
- Tất cả file pass precheck ở mức block-level (đã định nghĩa).
- Không còn nhãn dài / ký tự gây parse sai có khả năng gây đè tại mức báo động cao.
- Duplicate edge giữa cùng cặp node đã được xử lý hoặc tách luồng.
- Mức chệch render giữa file trong cùng nhóm giảm so với baseline (theo ảnh mẫu).

## 10) Risk Assessment
- Rủi ro false-positive quá nhiều làm tăng workload chỉnh tay.
- Rủi ro thay đổi config làm lệch scale toàn bộ chapter; cần fallback version.
- Rủi ro script fix auto đụng nhầm chữ kỹ thuật; cần dry-run + diff review.

## 11) Security Considerations
- Script và render chỉ thao tác trên repo nội bộ; cấm đọc/ghi file ngoài `resources/reports/thesis-chapters/assets`.
- Không chèn nội dung từ nguồn ngoài khi chỉnh label.
- Log precheck tránh in đầy đủ văn bản đặc thù nếu có dữ liệu nhạy cảm (không dự kiến trong thesis).

## 12) Next steps
- Bắt đầu Phase 3 (chuẩn hóa ngôn ngữ + actor/flow) sau khi có danh sách sửa tay P0/P1.
- Bắt đầu Phase 4 song song cho nhóm ưu tiên cao, nhưng giữ cùng ranh giới file.
- Unresolved questions: có cần chốt một schema ngắn hạn cho `label max` theo từng loại diagram không?