## Context links
- Input từ Phase 01: inventory + scope matrix
- Research: `./research/researcher-01-readability-heuristics.md`
- Docs chuẩn: `../../docs/code-standards.md`

## Overview
- Priority: P1
- Current status: completed
- Progress: 100%
- Mục tiêu: tạo rulebook ngắn và glossary thống nhất để áp cho toàn bộ asset.

## Key Insights
- Thiếu glossary sẽ gây drift thuật ngữ giữa text và diagram.
- Caption tự-đứng-được giúp hội đồng đọc lướt vẫn hiểu ý chính.
- Rule phải ngắn, kiểm được, không mơ hồ.

## Requirements
- Functional: bộ rules cho jargon/caption/label/structure; glossary Việt-Anh nhất quán (song ngữ cân bằng, giữ thuật ngữ kỹ thuật cần thiết).
- Non-functional: áp dụng nhanh, review nhanh, không tăng overhead.

## Architecture
- Rule layers: ngôn ngữ văn bản -> caption -> label diagram -> kiểm nhất quán liên file.
- Decision: term chính thức + term cấm dùng + pattern câu khuyến nghị.
- Governance: mọi chỉnh sửa Phase 03 phải bám rulebook này.

## Canonical glossary
- `dashboard` -> `bảng điều khiển web` when describing UI; keep `dashboard` only in product names, routes, or file paths.
- `diagram` -> `sơ đồ` in prose; keep tool names like `Mermaid`/`PlantUML` unchanged.
- `caption` -> `chú thích`; keep each caption self-standing in 1-2 sentences.
- `render` -> `dựng` or `tái sinh artifact` depending on context.
- `realtime` -> `thời gian thực` unless it is part of a canonical library name.

## Readability rules
1. Use Vietnamese for descriptive prose; keep technical names unchanged when they are load-bearing.
2. Prefer one idea per sentence; split long captions before they become multi-clause blocks.
3. Keep diagram labels short and concrete; avoid full sentences in node text.
4. Use one canonical term per concept across the batch; do not mix synonyms in the same file.
5. Keep captions self-contained: object, action, outcome.
6. Preserve version numbers, protocol names, and library names exactly as implemented.
7. Prefer explicit nouns over vague pronouns when the file is meant to stand alone.
8. Avoid hidden abbreviations unless the abbreviation is already canonical in the domain.

## Related code files
- Modify: file markdown thesis final trong scope
- Modify: file `.mmd` trong scope
- Create: không bắt buộc (ưu tiên nhúng rule ngắn trực tiếp trong plan phase)
- Delete: không

## Implementation Steps
1. Trích danh sách thuật ngữ hiện dùng từ asset in-scope.
2. Chọn canonical terms và mapping alias -> canonical.
3. Định nghĩa chuẩn caption hình/bảng/sơ đồ (mẫu 1-2 câu).
4. Định nghĩa giới hạn label diagram (độ dài, kiểu từ, viết tắt).
5. Chốt checklist review dùng cho Phase 03/04.

## Todo list
- [x] Có glossary canonical + alias map.
- [x] Có 6-10 readability rules dạng pass/fail.
- [x] Có mẫu caption chuẩn cho hình/bảng/sơ đồ.

## Success Criteria
- Mỗi thuật ngữ trọng yếu chỉ còn 1 tên chuẩn.
- Reviewer khác áp rule vẫn cho kết quả gần như giống nhau.
- Không có rule dư thừa, rule nào cũng gắn với lỗi thật từ Phase 01.

## Risk Assessment
- Risk: rule quá nhiều, khó dùng. Mitigation: giới hạn 6-10 rule cốt lõi (YAGNI).
- Risk: canonical term khó hiểu với người không chuyên. Mitigation: thêm định nghĩa 1 dòng/term.
- Risk: mâu thuẫn Việt-Anh. Mitigation: khóa cặp song ngữ chuẩn ngay từ đầu.

## Security Considerations
- Không chuẩn hóa theo hướng lộ endpoint, key, credential trong caption/label.
- Nếu cần ví dụ kỹ thuật, dùng dữ liệu đã ẩn danh.

## Next steps
- Chuyển rulebook + glossary cho Phase 03 để normalize hàng loạt.
