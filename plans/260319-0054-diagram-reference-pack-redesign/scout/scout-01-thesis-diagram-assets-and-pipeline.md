# Scout Report: Thesis Diagram Assets + Pipeline

## Relevant Files
- `resources/reports/thesis-chapters/assets/uml/README.md` - Quy ước source `.mmd` map 1-1 sang `figures/`, lệnh render hiện tại.
- `resources/reports/thesis-chapters/assets/thesis-mermaid-diagrams.mjs` - Loader đọc toàn bộ `.mmd` và map sang `.svg` output name.
- `resources/reports/thesis-chapters/assets/generate-thesis-report-figures.mjs` - Script render hiện hành: quét markdown chapter để lấy figures dùng thực tế, xóa ảnh cũ, render Mermaid CLI, có override kích thước theo filename.
- `resources/reports/thesis-chapters/assets/mermaid-thesis-config.json` - Theme/config Mermaid hiện dùng (strict security, deterministicIds, flowchart elk, spacing).
- `resources/reports/thesis-chapters/assets/uml/*.mmd` - Source sơ đồ đang dùng (Mermaid).
- `resources/reports/thesis-chapters/assets/figures/*.svg` - Output hình đang dùng trong luận văn.
- `resources/reports/thesis-report/*.md` - Nội dung báo cáo tham chiếu chapter-level.
- `.github/workflows/*.yml` - Có CI cho services hệ thống; chưa thấy workflow riêng cho render/QA bộ hình thesis.

## Existing Integration Constraints
- Bộ hiện tại đang render trực tiếp vào `resources/reports/thesis-chapters/assets/figures`; thay đổi script/config hiện hành có thể ảnh hưởng artifact đang dùng.
- Generator hiện tại có bước purge ảnh cũ trong `figures/`; không phù hợp nếu muốn chạy đồng thời nhiều pack.
- Mapping hiện dựa vào tên file và nội dung markdown chapters; đổi naming cần có map manifest rõ để tránh mismatch.
- Config Mermaid hiện đã tối ưu bố cục cho nhiều file cụ thể qua `renderSizeByFileName`; cần cơ chế override tương tự ở pack mới.
- Chưa có gate CI chuyên cho visual diff/checksum/schema của diagram pack.

## Recommendation For Planning Boundary
- Giữ nguyên toàn bộ path + script hiện dùng.
- Tạo pack tham chiếu mới ở nhánh thư mục độc lập, pipeline độc lập, output độc lập.
- Chỉ cho phép “adoption” qua tham số pack-id/version, không thay trực tiếp script cũ ngay.

## Unresolved Questions
- Có cần đồng bộ ngược từ pack mới vào pack cũ hay chỉ one-way migration khi đạt chuẩn?
- Mức tự động hóa mong muốn trong CI: chỉ render hay render + visual diff + release artifact?
