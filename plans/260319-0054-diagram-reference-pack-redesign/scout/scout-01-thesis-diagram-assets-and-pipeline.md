# Scout Report: Thesis Diagram Assets + Pipeline

## Relevant Files
- `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md` - Thesis markdown source artifact hiện giữ theo mô hình single-file.
- `resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs` - Loader đọc `.mmd` và map sang `.svg` output name trong final assets root hiện hành.
- `resources/reports/thesis/final/assets/generate-thesis-report-figures.mjs` - Script render hiện hành; có purge/render flow nên phải xem là protected legacy trong pilot.
- `resources/reports/thesis/final/assets/mermaid-thesis-config.json` - Theme/config Mermaid hiện dùng (strict security, deterministicIds, flowchart elk, spacing).
- `resources/reports/thesis/final/assets/uml/*.mmd` - Source sơ đồ đang dùng (Mermaid).
- `resources/reports/thesis/final/assets/figures/*.svg` - Output hình đang dùng trong luận văn.
- `.github/workflows/*.yml` - Có CI cho services hệ thống; chưa thấy workflow riêng cho render/QA bộ hình thesis.

## Existing Integration Constraints
- Bộ hiện tại render trực tiếp vào `resources/reports/thesis/final/assets/figures`; thay đổi script/config hiện hành có thể ảnh hưởng artifact đang dùng.
- Generator hiện tại có bước purge ảnh cũ trong `figures/`; không phù hợp nếu muốn chạy đồng thời nhiều pack.
- Mapping hiện dựa vào prefix tên file đang dùng trong final assets; đổi naming cần có manifest/map rõ để tránh mismatch.
- Config Mermaid hiện đã tối ưu bố cục cho nhiều file cụ thể qua override theo filename; pack mới cần cơ chế tương tự.
- Thesis hiện chỉ còn single-file markdown; mọi plan mới không được giả định source layout `chapters/` nữa.
- Chưa có gate CI chuyên cho visual diff/checksum/schema của diagram pack.

## Recommendation For Planning Boundary
- Giữ nguyên toàn bộ path + script hiện dùng dưới `resources/reports/thesis/final/assets/`.
- Tạo pack tham chiếu mới ở nhánh thư mục độc lập, pipeline độc lập, output độc lập.
- Chỉ cho phép adoption qua tham số pack-id/version, không thay trực tiếp script cũ ngay.

## Unresolved Questions
- Có cần đồng bộ ngược từ pack mới vào pack cũ hay chỉ one-way migration khi đạt chuẩn?
- Mức tự động hóa mong muốn trong CI: chỉ render hay render + visual diff + release artifact?
