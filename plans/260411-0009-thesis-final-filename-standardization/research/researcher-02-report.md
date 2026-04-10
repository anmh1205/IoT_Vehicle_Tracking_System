# Research Report: Bulk rename dependency touchpoints (`resources/reports/thesis/final`)

- Thời gian: 2026-04-11 00:09:26 (Asia/Saigon)
- Phạm vi: chỉ planning/research, không sửa code

## Executive summary
Đổi tên hàng loạt trong `resources/reports/thesis/final` có rủi ro cao vì đang có ràng buộc theo *filename* ở 3 lớp: markdown refs, LaTeX include paths, và pipeline tạo figure từ Mermaid. Nếu rename thiếu 1 lớp sẽ sinh broken image/link hoặc build output sai tên.

Luồng an toàn: **inventory -> dry-run map -> conflict check -> apply rename theo thứ tự -> regenerate figures -> build -> validate -> commit**. Phải giữ nguyên nguyên tắc KISS: một canonical basename duy nhất cho thesis chính, không giữ song song nhiều prefix lâu dài (`99-`, `thesis-`, `thesis-build`).

## Dependency scan matrix (where refs live + update method)
| Touchpoint | Đang phụ thuộc gì | Bằng chứng từ scan | Cách update an toàn |
|---|---|---|---|
| Thesis markdown chính | `./assets/figures/<name>.svg` hardcoded | `99-bao-cao-thesis-hoan-chinh.md` có nhiều image refs | Batch replace theo mapping old->new; validate no dangling refs |
| Thesis LaTeX | `\safeincludesvg{./assets/figures/<name>.svg}` | `99-bao-cao-thesis-hoan-chinh-latex.tex` có refs figure dày đặc | Regenerate từ source canonical hoặc replace đồng bộ với markdown |
| Mermaid source loader | `.mmd -> .svg` theo *cùng basename* | `assets/thesis-mermaid-diagrams.mjs` line 7-17 | Rename `.mmd` phải đồng bộ expected `.svg` name |
| Figure generator | figure names lấy từ markdown refs rồi lookup `diagramByFileName` | `assets/generate-thesis-report-figures.mjs` line 75-94 + 181-187 | Update markdown trước, rồi mapping loader; chạy generator để fail-fast missing mapping |
| Figure assets folder | chứa output `.svg/.png` mixed prefix | `assets/figures/*` có `thesis-99-...` + số chương | Purge/regenerate sau rename, không rename thủ công file generated |
| Build artifacts | basename output hiện không nhất quán | có `thesis-build.pdf/log/aux` và `99-bao-cao-...log/fls/fdb_latexmk` | Chuẩn hóa 1 rule basename, dọn artifact cũ trước build |
| Docs ngoài thư mục final | nhắc trực tiếp path/file thesis | `docs/project-changelog.md`, `docs/codebase-summary.md` | grep toàn repo rồi patch nếu path đổi |

## Fact lock (must reflect)
1. `assets/thesis-mermaid-diagrams.mjs` map filename `.mmd` sang `.svg` bằng basename tương ứng.
2. `assets/generate-thesis-report-figures.mjs` derive danh sách figure từ markdown refs (`assets/figures/...`) và throw error nếu thiếu mapping.
3. Prefix đang lẫn: `99-...`, `thesis-...`, `thesis-build...` (source + generated + build outputs).

## Canonical basename rule (LaTeX output)
Rule đề xuất:
- Chọn **1 canonical main tex basename** (vd: `thesis-final.tex` hoặc giữ `99-bao-cao-thesis-hoan-chinh-latex.tex`).
- Output PDF/log/aux/fdb/fls **phải cùng basename canonical đó**.
- Không dùng `thesis-build` nếu main `.tex` không phải `thesis-build.tex` (tránh drift và nhầm artifact).

Hệ quả thực thi:
- Build command phải explicit `-jobname=<canonical-basename-khong-ext>` **hoặc** bỏ `-jobname` để mặc định theo tên `.tex`, nhưng phải nhất quán 1 kiểu.

## Dry-run process (no file mutation)
1. Tạo rename map CSV/JSON: `old_rel_path,new_rel_path` cho toàn bộ file cần chuẩn hóa tên.
2. Dry-run check A: duplicate target path (case-sensitive + case-insensitive cho Windows).
3. Dry-run check B: target đã tồn tại và không nằm trong map overwrite-safe.
4. Dry-run check C: với mỗi renamed `.mmd`, verify expected `.svg` target có thể resolve trong mapping.
5. Dry-run check D: simulate replace count trong `.md` + `.tex` (đếm occurrences old token).
6. In summary: `to_rename`, `conflicts`, `unresolved_refs`, `zero-hit replacements`.

## Conflict detection checklist
- Collision cùng đích sau normalize slug.
- Rename chỉ khác hoa/thường trên win32 (dễ fail hoặc no-op).
- Nhiều old names trỏ 1 target.
- Ref trong markdown/latex tới figure không còn nguồn `.mmd`.
- Artifact cũ (`thesis-build.*`, `99-...*.log`) làm nhiễu grep/validate.

## Safe execution order
1. Freeze canonical naming spec (main tex basename + figure naming policy).
2. Generate + approve rename map (dry-run pass 100%).
3. Rename source diagrams `.mmd` trước (nếu đổi policy figure names).
4. Update loader/mapping expectations (theo basename rule).
5. Update markdown refs.
6. Regenerate figures bằng `assets/generate-thesis-report-figures.mjs`.
7. Regenerate/rebuild latex source (nếu pipeline tạo `.tex` từ markdown).
8. Build PDF với canonical output basename.
9. Validate toàn bộ (grep/build/link/image).

## Rollback procedure
- Preconditions: commit hoặc stash snapshot trước khi apply rename.
- Nếu fail trước regenerate/build: `git restore` các file touched theo rename map.
- Nếu fail sau regenerate figures: restore + purge artifacts vừa sinh lại.
- Nếu fail sau build: restore source + xóa artifact mới (`*.aux,*.log,*.fls,*.fdb_latexmk,*.pdf`) của run hiện tại.
- Hard stop criteria: missing mapping >0, broken refs >0, build error != 0.

## Validation checklist (must-run)
1. Grep orphan refs:
   - refs `assets/figures/...` trong `.md/.tex` đều tồn tại file thực.
   - không còn prefix cũ bị cấm (theo naming policy đã chốt).
2. Figure generation:
   - chạy `generate-thesis-report-figures.mjs` pass, không `Missing Mermaid mapping`.
3. LaTeX build:
   - build thành công, output basename == canonical `.tex` basename rule.
4. Broken links/images:
   - không còn image missing trong markdown preview và PDF output.
5. Hygiene:
   - không còn artifact legacy gây hiểu nhầm (`thesis-build.*` nếu không canonical).

## Khuyến nghị ngắn
- Đừng rename trực tiếp file generated trong `assets/figures`; coi đó là output của generator.
- Chuẩn hóa từ nguồn (`.mmd` + refs markdown), rồi regenerate.
- Chốt 1 basename canonical cho thesis build, bỏ mixed-prefix dần theo 1 đợt migration.

## Unresolved questions
1. Canonical basename chính thức muốn dùng là gì (giữ `99-...` hay chuyển `thesis-final`)?
2. `.tex` hiện là source canonical hay generated từ markdown trong pipeline chính thức?
3. Có yêu cầu backward-compat tạm thời (alias/symlink/copy) cho tên cũ không?