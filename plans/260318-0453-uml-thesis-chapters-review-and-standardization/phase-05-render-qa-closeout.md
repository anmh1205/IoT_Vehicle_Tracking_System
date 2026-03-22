# Phase 5: QA trước/sau render và đóng gói

## 1) Context links
- Plan tổng quan:
  - `plans/260318-0453-uml-thesis-chapters-review-and-standardization/plan.md`
- Các phase trước:
  - `plans/260318-0453-uml-thesis-chapters-review-and-standardization/phase-01-scope-and-risk-triage.md`
  - `plans/260318-0453-uml-thesis-chapters-review-and-standardization/phase-02-pre-render-standardization-gates.md`
  - `plans/260318-0453-uml-thesis-chapters-review-and-standardization/phase-03-language-and-flow-consistency.md`
  - `plans/260318-0453-uml-thesis-chapters-review-and-standardization/phase-04-layout-and-arrow-label-corrections.md`
- Pipeline render:
  - `resources/reports/thesis-chapters/assets/generate-thesis-report-figures.mjs`
  - `resources/reports/thesis-chapters/assets/mermaid-thesis-config.json`

## 2) Overview
- Đóng gói giai đoạn review bằng quy trình QA chặt nhưng thực dụng:
  - pre-render QA, render lại, post-render QA, sign-off.
- Nền tảng: giảm lỗi overlay về 0 cho file ưu tiên cao, kiểm soát thay đổi diện rộng trước khi chốt.

## 3) Key Insights
- Lỗi overlay thường chỉ lộ rõ sau render, nên precheck đơn thuần chưa đủ.
- Có tính nhất quán trong pipeline, nên QA cần lưu phiên bản render trước/sau để đối chiếu.
- Nên giảm kiểm định đầu vào bằng checklist có ngưỡng rõ để tránh vòng lặp không hồi kết.

## 4) Requirements
<!-- Updated: Validation Session 1 - require image diff for all waves -->
- Trước render: toàn file phải có kết quả precheck pass (blocker được gán).
- Sau render: kiểm tra 3 lớp:
  1. visual: nhãn không đè mũi tên/hình;
  2. semantic: nhãn không mất ý nghĩa;
  3. traceability: giữ mapping `.mmd`->`.svg`.
- **Bắt buộc image diff cho toàn bộ P0/P1/P2** trong QA hậu render.
- Lưu chứng cứ QA: kết quả script + screenshot hoặc ảnh chụp vùng lỗi đã sửa.
- Tất cả báo cáo phải gắn `timestamp`.

## 5) Architecture
- QA flow:
  - Script check -> danh sách lỗi -> sửa -> render -> kiểm tra thủ công nhanh + checklist -> cập nhật trạng thái.
- Theo dõi theo batch wave:
  - wave 1: P0, wave 2: P1, wave 3: P2.
- Tài sản đầu ra:
  - `reports/planner-report.md` (log),
  - `plans/260318-0453-uml-thesis-chapters-review-and-standardization/reports` (giao nộp QA artifacts text)
- Không thay đổi mã nguồn ngoài scope thesis.

## 6) Related code files
- **Script/góc kỹ thuật:**
  - `resources/reports/thesis-chapters/assets/generate-thesis-report-figures.mjs`
  - `resources/reports/thesis-chapters/assets/` (nơi sinh artifact hiện có)
- **Output kiểm chứng:**
  - `resources/reports/thesis-chapters/assets/figures/*.svg`
  - `plans/260318-0453-uml-thesis-chapters-review-and-standardization/reports/*`

## 7) Implementation Steps
1. Xây checklist QA theo từng phase và mức ưu tiên.
2. Chạy precheck toàn bộ file trước render batch đầu.
3. Render theo wave (P0 trước), lưu `Rendered: ...` log + số lượng thành công.
4. Thực hiện post-render visual QA nhanh:
   - zoom 200%, rà toàn đồ trong danh sách lỗi đã biết;
   - check cặp đầu mút gần nhau;
   - check text bị cắt/đè.
5. Dùng diff baseline: trước/sau render theo nhóm để phát hiện drift layout lớn.
6. Duyệt lại flow semantics theo sample chapter sau khi render.
7. Kết thúc mỗi wave:
   - cập nhật trạng thái file, ghi số lỗi còn lại;
   - chốt `pass/fail` có timestamp và người verify.
8. Closeout: tạo báo cáo tổng và đề xuất chỉnh sửa duy trì cho phiên sau.

## 8) Todo list
- [ ] Chuẩn bị checklist QA chuẩn cho toàn kỳ.
- [ ] Cập nhật báo cáo tiến độ theo wave.
- [ ] Render P0/P1 trước, P2 sau.
- [ ] Chạy post-render visual QA.
- [ ] Xác nhận không phát sinh semantic mismatch mới.
- [ ] Ký xác nhận đóng gói phase 5.

## 9) Success Criteria
- 0 file P0 có lỗi overlay được xác nhận còn lại.
- 0 file P1 có lỗi overlay sau khi wave 2 hoàn tất.
- 100% file đã sửa có log pre/post + trạng thái.
- `generate-thesis-report-figures.mjs` không có render lỗi không giải thích.
- Mapping `.mmd`->`.svg` đầy đủ sau render.

## 10) Risk Assessment
- Rủi ro: visual QA thủ công có yếu tố chủ quan.
- Rủi ro: ảnh lớn dễ nặng, chậm mở nên giảm số lần kiểm.
- Rủiol: deadline gấp làm nảy sinh việc bỏ sót file P2.

## 11) Security Considerations
- Không lưu dữ liệu bí mật vào log; chỉ tên file và trạng thái QA.
- Không chia sẻ artifact trước khi qua kiểm soát QA nội bộ.
- Cần tách artifact theo run để dễ truy vết nếu có rollback.

## 12) Next steps
- Tổ chức walkthrough + handoff cho planner/developer-like agent.
- Đóng tất cả unresolved tại planner-report.
- Sau closeout, cập nhật docs changelog/roadmap nếu cần theo quy trình.