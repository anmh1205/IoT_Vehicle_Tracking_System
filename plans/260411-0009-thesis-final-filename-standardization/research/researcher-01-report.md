# Research Report: Filename taxonomy for `resources/reports/thesis/final`

Timestamp: 2026-04-11 00:09:26 (Asia/Saigon)

## Scope
- Mục tiêu: chuẩn hóa tên file tối giản, loại prefix bẩn kiểu `99-...`, vẫn giữ ngoại lệ template/build.
- Phạm vi khảo sát: `resources/reports/thesis/final/**/*` (thực tế thấy nhiều `.md/.tex/.mmd/.pdf/.png`, có ngữ cảnh `.svg/.log/.aux/.tmp` cần policy dù chưa thấy rõ trong listing rút gọn).
- Không đụng nội dung file, chỉ taxonomy đặt tên.

## Observed naming patterns
- Có 3 họ chính đang trộn lẫn:
  1) `NN-chuong-...-hinh-X-Y(.mmd/.pdf...)` (vd `04-chuong-3-giai-phap-firmware-hinh-3-7.mmd`) — tương đối sạch.
  2) `thesis-NN-...(.mmd)` (vd `thesis-05-chuong-3-giai-phap-backend-01.mmd`) — hợp lệ nhưng trùng ý nghĩa với họ (1).
  3) Prefix bẩn/final-dump: `99-bao-cao-thesis-hoan-chinh...` và `thesis-99-...` — cần loại bỏ.
- File template có naming dài, chứa unicode, khoảng trắng, timestamp (`2025-04-27....Template...`).
- Có thư mục ảnh tạm readability draft: `image/99-bao-cao-thesis-hoan-chinh-readability-draft/...png`.
- Có hậu tố kỹ thuật lẫn domain (`_svg-raw`, `hinh-4-14a`) chưa nhất quán separator.

## Proposed canonical naming rules
1. **Global format (default)**: `thesis-{chapter2d}-{section-slug}-{asset-kind}-{asset-id}.{ext}`
   - chapter2d: `01..14` (zero-pad 2 chữ số).
   - section-slug: kebab-case ASCII, bỏ dấu tiếng Việt.
   - asset-kind: `report|figure|diagram|table|appendix|template|build|draft|schematic`.
   - asset-id: số hoặc số+suffix chữ (`14a`).
2. **Strict ban list**:
   - Cấm prefix: `99-`, `thesis-99-`, `final-`, `new-`, `copy-`, `untitled`.
   - Cấm khoảng trắng trong file vận hành thường ngày (trừ template exception).
3. **Normalization**:
   - Chỉ lowercase + `[a-z0-9-]` trong slug.
   - Một dấu `-` làm separator duy nhất (không `_` trừ build tool bắt buộc).
4. **Uniqueness**:
   - Không encode ngày trong tên file nội bộ trừ artifact xuất bản.
   - Khi trùng ngữ nghĩa: tăng `asset-id` (`...-01`, `...-02`).
5. **Directory intent giữ nguyên, tên file gọn**:
   - Ngữ cảnh đặt trong folder (`assets/uml`, `assets/schematic`, `image/drafts`) thay vì nhồi vào prefix.

## Exception policy (templates/build artifacts)
- **Template exception (được giữ nguyên hoặc alias mềm):**
  - File từ trường/đơn vị đào tạo (docx/pdf/tex template gốc) được phép giữ tên vendor/original để truy vết pháp lý.
  - Khuyến nghị thêm 1 bản alias sạch để dùng nội bộ, nhưng không bắt buộc đổi file gốc.
- **Build artifacts (không đưa vào taxonomy nghiệp vụ):**
  - `.log/.aux/.tmp` và file trung gian compile: cho phép pattern kỹ thuật `build-{target}-{runid}.{ext}` hoặc để tool tự sinh trong thư mục `build/`.
  - Không rename thủ công theo chapter taxonomy vì không mang giá trị nội dung.
- **Readability/test drafts:**
  - Dồn vào `image/drafts/` với format `draft-{topic}-{seq}.{png|pdf}`; cấm `99-...`.

## Example before/after matrix by file type (.tex/.md/.mmd/.svg/.png/.pdf/.log/.aux/.tmp)
| Type | Before | After (canonical) |
|---|---|---|
| .tex | `2025-04-27.MEM710071_..._ISO template.tex` | `thesis-template-vie-iso-v2.tex` *(alias; gốc giữ nguyên theo exception)* |
| .md | `99-bao-cao-thesis-hoan-chinh.md` | `thesis-14-final-report.md` |
| .mmd | `thesis-99-bao-cao-thesis-hoan-chinh-04.mmd` | `thesis-14-final-diagram-04.mmd` |
| .svg | `03-chuong-3-giai-phap-phan-cung-hinh-3-1.svg` | `thesis-03-phan-cung-figure-3-1.svg` |
| .png | `1774979640345.png` (trong draft folder) | `draft-readability-01.png` |
| .pdf | `01-chuong-1-gioi-thieu-hinh-1-1_svg-raw.pdf` | `thesis-01-gioi-thieu-figure-1-1-raw.pdf` |
| .log | `thesis.log` | `build-thesis-main.log` |
| .aux | `thesis.aux` | `build-thesis-main.aux` |
| .tmp | `tmp1234.tmp` | `build-thesis-main-01.tmp` |

## Risks
- Rename hàng loạt có thể làm gãy link tham chiếu trong `.tex/.md` nếu không có mapping script.
- Bản template gốc nếu đổi tên trực tiếp có rủi ro mất traceability với nguồn chính thức.
- Trộn hai chuẩn cũ (`NN-chuong...` và `thesis-NN...`) gây mập mờ nếu migration nửa vời.

## Unresolved questions
1. Có chốt 1 chuẩn duy nhất `thesis-{chapter2d}-...` cho toàn bộ file mới không, hay chấp nhận song song với `NN-chuong-...` trong giai đoạn chuyển tiếp?
2. Template gốc có yêu cầu “không đổi tên tuyệt đối” không (phục vụ audit/hội đồng)?
3. Build artifacts muốn loại khỏi git hoàn toàn hay giữ có kiểm soát trong thư mục `build/`?
4. Cần bảng mapping rename chính thức (old→new) cho migration batch không?
