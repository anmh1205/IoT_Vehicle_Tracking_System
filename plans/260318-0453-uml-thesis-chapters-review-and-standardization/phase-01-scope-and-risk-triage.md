# Phase 1: Xác định phạm vi và phân loại rủi ro UML

## 1) Context links
- Research input:
  - `plans/260318-0453-uml-thesis-chapters-review-and-standardization/research/researcher-01-report.md`
  - `plans/260318-0453-uml-thesis-chapters-review-and-standardization/research/researcher-02-report.md`
- Source map:
  - `resources/reports/thesis-chapters/assets/uml/README.md`
  - `resources/reports/thesis-chapters/assets/generate-thesis-report-figures.mjs`
  - `resources/reports/thesis-chapters/assets/thesis-mermaid-diagrams.mjs`
  - `resources/reports/thesis-chapters/assets/mermaid-thesis-config.json`
- Thesis chapters:
  - `resources/reports/thesis-chapters/03-chuong-3-giai-phap-phan-cung.md`
  - `resources/reports/thesis-chapters/04-chuong-3-giai-phap-firmware.md`
  - `resources/reports/thesis-chapters/05-chuong-3-giai-phap-backend.md`
  - `resources/reports/thesis-chapters/06-chuong-3-giai-phap-frontend.md`
  - `resources/reports/thesis-chapters/07-chuong-4-trien-khai-hardware.md`
  - `resources/reports/thesis-chapters/09-chuong-4-trien-khai-cloud.md`
  - `resources/reports/thesis-chapters/10-chuong-4-ket-qua-do-luong.md`
  - `resources/reports/thesis-chapters/99-bao-cao-thesis-hoan-chinh.md`

## 2) Overview
- Ưu tiên đầu tiên: chốt phạm vi chỉnh sửa, tránh sửa “hết mọi thứ” rồi lan man.
- Scope thực thi: toàn bộ file `.mmd` trong `assets/uml` đã có tương ứng hình `.svg`.
- Kết quả phase 1: ma trận phân loại rủi ro + sequence ưu tiên chỉnh sửa cho team.

## 3) Key Insights
- Repo đã có 2 nhóm file nhạy cảm:
  - file mật độ cạnh/cụm label cao (nhóm `09-*`, `10-*`, `thesis-99-*`), dễ lỗi đè nhãn;
  - file gần đây/đã churn nhiều (`04-3-7..11`, `05-3-12..14a`, `06-3-15..23`).
- Có mâu thuẫn tên file giữa report nghiên cứu và repo thực tế (`thesis-...` đã chuẩn hoá theo `resources/reports/thesis-chapters/*.md`).
- Pipeline render hiện ở `generate-thesis-report-figures.mjs` đi theo mapping toàn bộ file `.mmd` đã nạp trong `thesis-mermaid-diagrams.mjs` rồi mới lọc theo usage trong markdown.

## 4) Requirements
- **Chỉ scope chỉnh sửa thesis**: `.mmd` và file SVG sinh ra.
- **Không đổi cấu trúc nghiệp vụ**; không sửa content ngoài thesis scope.
- Phải giữ **ngôn ngữ tiếng Việt có dấu**; thuật ngữ kỹ thuật giữ nguyên theo glossary.
- Các chỉnh sửa phải có thể review bằng `git diff` theo nhóm file.

## 5) Architecture
- `UML Source (.mmd)` → `thesis-mermaid-diagrams.mjs` (loader) → `generate-thesis-report-figures.mjs` (render) → `assets/figures/*.svg`.
- QA loop: pre-render audit (text/static) rồi render rồi manual QA nhẹ trên SVG. Nếu fail, quay lại chỉnh trực tiếp `.mmd`.
- Phân vùng ưu tiên:
  1. P0: lỗi logic/chèn nhãn đâm mũi tên trong nhóm mật độ cao.
  2. P1: nhóm có churn lớn hoặc đã có chỉnh sửa gần đây.
  3. P2: nhóm nền tảng ít phức tạp.

## 6) Related code files
- **Inspect/read only:**
  - `resources/reports/thesis-chapters/assets/uml/*.mmd`
  - `resources/reports/thesis-chapters/assets/README.md` (nếu có)
  - `resources/reports/thesis-chapters/assets/generate-thesis-report-figures.mjs`
  - `resources/reports/thesis-chapters/assets/thesis-mermaid-diagrams.mjs`
  - `resources/reports/thesis-chapters/assets/mermaid-thesis-config.json`
  - `resources/reports/thesis-chapters/*.md`
- **No new files required** ở phase này.

## 7) Implementation Steps
1. Xây bảng inventory toàn bộ file `.mmd` + số node/edge gần đúng theo `Grep`/script.
2. Map 1-1 `.mmd` ↔ `.svg` theo quy tắc trong `assets/uml/README.md`.
3. Xác định nhóm rủi ro theo 3 lớp:
   - **P0:** 09-* (15 files), 10-* (19 files), thesis-99-* (9 files), 03-3-1..4.
   - **P1:** 04-5-6 với nhánh firmware/backend/frontend liên quan.
   - **P2:** 01,02,07,08,14.
4. Chuẩn hóa danh sách chapter mapping thật cho từng file `.mmd` theo tên file markdown thực tế (khắc phục mismatch).
5. Tạo 1 output kế hoạch batch 3 vòng:
   - Wave A: sửa render/label.
   - Wave B: rà ngôn ngữ + flow.
6. Xác nhận `effort owner` theo nhánh song song max 2:
   - Branch A xử lý nhóm P0/P1 render.
   - Branch B xử lý ngôn ngữ & logic cho cùng nhóm P0/P1.

## 8) Todo list
- [ ] Tạo inventory file `reports/planner-report.md` gồm tổng số file theo lớp rủi ro.
- [ ] Xác thực mapping `.mmd` ↔ `.md` chapter chuẩn theo tên file thực tế trong repo.
- [ ] Đánh dấu file trùng lặp, file đã xóa, file có hậu tố `-a`.
- [ ] Chuẩn hóa danh mục P0/P1/P2 để truyền cho phase 2,3,4.
- [ ] Công bố phân công 2 nhánh song song.

## 9) Success Criteria
- Có danh sách tổng quan đầy đủ tất cả `.mmd` và mức rủi ro.
- Không còn nghi ngờ về mapping chapter tên file.
- Đã khóa thứ tự batch sửa theo ưu tiên và phạm vi rõ ràng.
- Có phân công 2 nhánh song song trên kế hoạch, không chồng file giữa nhánh.

## 10) Risk Assessment
- Rủi ro sai mapping file-name sẽ làm render thiếu hình.
- Rủi ro chỉnh vượt scope nếu không có list boundary.
- Rủi ro trùng sửa song song khi 2 nhánh cùng sửa một file.

## 11) Security Considerations
- Không expose token/ký tự nhạy cảm trong diagram data (thường chưa có), nhưng cần kiểm tra không có placeholder nhầm.
- Khi chuyển script audit, dùng đường dẫn tuyệt đối trong repo, không nạp path user input.
- Không chèn nội dung từ bên ngoài khi batch normalize (không copy paste từ source ngoài dự án).

## 12) Next steps
- Đi sang phase 2: chuẩn hóa pre-render gates (label length, duplicate edge, syntax lint).
- Song song, phase 3 có thể bắt đầu chuẩn hóa ngôn ngữ khi phase 1 đã khóa nhóm.
- Chờ kết quả phase 1 trước khi mở phase 4 rộng.