# Báo cáo researcher-02: Quy trình xuất bản/chuẩn hóa bộ biểu đồ tham chiếu mới (song song)

- Ngày: 2026-03-19 00:54:35 (Asia/Saigon)
- Work context: `E:/anmh1205/IoT_Vehicle_Tracking_System`
- Mục tiêu: nghiên cứu quy trình cho **reference pack mới** không ảnh hưởng pipeline hiện tại dưới `resources/reports/thesis/final/assets/` và vẫn cho phép chuyển đổi an toàn.

## 1) Cấu trúc thư mục đề xuất (parallel pack)
Giữ nguyên pack cũ. Thêm pack mới dưới root mới `resources/reports/diagram-reference-packs/`.

```text
resources/reports/diagram-reference-packs/
  diagram-pack-v2/
    manifest.yaml
    style/
      mermaid-theme.json
      diagram-rules.md
    src/
      uml/
      drawio/
    build/
      svg/
      png/
      pdf/
    baselines/
      svg/
      png/
    qa/
      checks/
        static-rules/
        visual-compare/
      gates/
        manifest.schema.json
        report.jsonl
```

- `pack-id` = `diagram-pack-v2` (độc lập).
- `manifest.yaml` map 1-1: `source.mmd -> outputs(svg,png,pdf)` và semantic tags (`source_ref`, `status`, `owner`, `rev`).
- `build/` và `baselines/` tách bạch với `resources/reports/thesis/final/assets/figures` hiện tại, nên không đụng ảnh đang dùng.
- Pipeline mới ghi ra `resources/reports/diagram-reference-packs/<pack-id>/build/<format>/`; consumer hiện hành vẫn đọc nguồn cũ.

## 2) Naming + versioning (chuẩn hóa, dễ rollback)
- Đặt quy tắc version theo **SemVer** tại manifest: `major.minor.patch`.
  - `major`: thay đổi API output map (schema/format bắt buộc).
  - `minor`: thêm/chỉnh sửa sơ đồ không đổi contract cơ bản.
  - `patch`: chỉnh sửa nội dung/visual có thể đánh giá lại QA.
- Mỗi file diagram giữ prefix figure hiện hành trong `thesis/final/assets` để giảm churn. Ví dụ: `09-chuong-4-trien-khai-cloud-hinh-4-20.mmd` hoặc `thesis-99-bao-cao-thesis-hoan-chinh-01.mmd`.
- Tên artifact CI: `diagram-pack-v2-<version>-<format>-<gitsha>-<date>`.
- Bổ sung `x-metadata` trong manifest:
  - `mermaid_version`, `cli_version`, `layout_profile`, `render_profile`, `checksum sha256`, `status=active|candidate|deprecated`.

## 3) Export targets: SVG/PNG/PDF
- **SVG**: format mặc định cho docs web, giữ text vector, dễ diff theo semantic.
- **PNG**: chuẩn UI preview, thuyết trình, dùng preset DPI/scale theo loại sơ đồ.
- **PDF**: xuất bản/chính thức, đóng gói để in ấn.
- Đề xuất luồng render:
  1) validate source (`.mmd` + manifest) ->
  2) render `svg` ->
  3) render `png` từ cùng config ->
  4) render `pdf` ->
  5) ghi metadata + checksum.
- Bắt buộc lưu cấu hình riêng cho từng pack (`style/mermaid-theme.json`) để tránh drift phiên bản.

## 4) CI validation ideas (từ local và web refs)
- **Pre-render checks (local script):**
  - validate manifest schema (YAML/JSON schema), UTF-8, 1-1 mapping, duplicate node labels, `edge label` vượt ngưỡng, ký tự cấm (`|` trong nhãn).
  - chặn build nếu file thiếu trong manifest hoặc có file thừa.
- **Render checks:**
  - chạy CLI trên cả 3 target (svg/png/pdf). Nếu môi trường không có cache CLI, fallback install với lock version.
- **Visual QA:**
  - lưu baseline ảnh (svg→png raster hóa), `image diff` với `pixelmatch` hoặc test snapshot trong Playwright; cho phép threshold nhỏ và block error khi vượt ngưỡng.
  - kiểm tra kích thước ảnh và diện tích trắng/độ tương phản.
- **Artifact/gate:**
  - upload artifacts `figures`, `baselines`, `qa/report.jsonl`.
  - fail build nếu có diff, nếu checksum thay đổi ngoài whitelist.
- **Quality gate integration:**
  - chỉ khi mọi check pass mới đánh dấu `status: active`.

## 5) Style guide + QA checklist
**Style guide tối thiểu (KISS):**
- layout: khóa `flowchart` profile ổn định (curve, spacing), `fontFamily` thống nhất, `securityLevel: strict`, không dùng cú pháp gây vỡ.
- nhãn edge <=24 ký tự; dài hơn thì tách dòng.
- tránh `|label|` phức tạp, ưu tiên tên ngắn + `\n`.
- tối ưu `node/edge` spacing theo nhóm diagram.

**QA checklist (đóng gói/khớp chất lượng):**
1) Source parse OK, mapping file hợp lệ.
2) Không file nào mất trong manifest.
3) Render 3 format thành công.
4) SVG semantic diff không đổi quá giới hạn (nếu cần review manual).
5) Overlay check: label không đè mũi tên theo snapshot automated/manual.
6) Chuỗi text tiếng Việt không lỗi font/codec.
7) Baseline checksum/metadata đổi đúng scope.

## 6) Kế hoạch nhận diện & adoption không đụng pack hiện tại
- Bước 1: thiết lập pack mới (`diagram-pack-v2`) + script render riêng, không sửa `resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs` hoặc `generate-thesis-report-figures.mjs` hiện hành.
- Bước 2: CI chạy song song kiểm tra pack mới và giữ pack cũ làm baseline.
- Bước 3: tạo bản xem trước trong PR (artifact + diff report), chỉ reviewer có quyền bật `consume_pack: v2`.
- Bước 4: sau 1-2 vòng nghiệm thu, chuyển consumer bằng biến cấu hình duy nhất (`DIAGRAM_PACK_REF=diagram-pack-v2@x.y.z`).
- Bước 5: gỡ bỏ pack cũ khỏi tiêu dùng sau khi thời gian “độ ổn định” đủ (không cần xoá source).

## 7) Rollback strategy (an toàn, nhanh)
- Giữ luôn pack cũ và pack mới cùng tồn tại.
- Rollback chỉ bằng 2 thao tác: đổi `pack-id/version` về bản trước và đẩy bản fix tương ứng.
- Nếu render mới hỏng: tạm khóa giai đoạn CI trên pack mới, giữ artifact pack cũ để phục vụ hotfix tài liệu ngay.
- Dọn dẹp sau rollback: remove các artifacts/nhánh thử nghiệm, khôi phục biến cấu hình môi trường về pack cũ.

## 8) Unresolved questions
- Có bắt buộc chuyển toàn bộ consumer sang `PDF` hay chỉ một phần (ví dụ luận văn/final export only)?
- Có cần baseline snapshot theo commit đầu vào hay theo pack release hash không?
- Ngưỡng chấp nhận visual diff (%) nên cố định hay điều chỉnh theo nhóm diagram?
- Có chấp nhận thay đổi layout profile (VD `LR/TB`) theo section group trong single-file thesis hay buộc global cho toàn pack?

## Sources (trích dẫn)
- [Mermaid CLI (official)](https://github.com/mermaid-js/mermaid-cli)
- [Mermaid JS config/CLI docs](https://mermaid.js.org/config/mermaidCLI)
- [GitHub Actions artifacts docs](https://docs.github.com/en/actions/tutorials/store-and-share-data)
- [upload-artifact v4](https://github.com/actions/upload-artifact)
- [Playwright snapshot assertions](https://playwright.dev/docs/api/class-snapshotassertions)
- [pixelmatch](https://www.npmjs.com/package/pixelmatch)
- [Husky pre-commit](https://typicode.github.io/husky/get-started.html)
- [lint-staged docs](https://github.com/lint-staged/lint-staged)
