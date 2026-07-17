# Audit rulebook — thesis LaTeX

- Scope: `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`, `.log`, assets SVG
- Policy lock (from plan validation):
  - Citation style: IEEE
  - Self-authored figures: không ghi nguồn
  - Overfull gate: `> 5pt` = FAIL
  - Cover gate: khớp gần như tuyệt đối template 2025-04-27

## Rule set (pass/fail)

| Rule ID | Group | PASS condition | FAIL condition | Severity default |
|---|---|---|---|---|
| CIT-IEEE-01 | Citation framework | Có cơ chế citation nhất quán (IEEE), truy vết được | Không có macro citation hoặc trích dẫn rời rạc không truy vết | Critical |
| CIT-IEEE-02 | Source↔reference linkage | Nguồn ngoài map rõ đến mục tài liệu tham khảo | Dòng nguồn/câu tham chiếu không map được đến tài liệu | High |
| FIG-CAP-01 | Figure caption | Mỗi hình có caption chuẩn `Hình x.y` | Thiếu caption hoặc caption sai chuẩn | High |
| FIG-SRC-01 | Figure source policy | Hình tự dựng: không có dòng nguồn | Hình tự dựng vẫn có dòng `Nguồn:` | High |
| FIG-SRC-02 | Figure source completeness | Hình ngoài có nguồn + citation | Hình ngoài thiếu nguồn/citation | Critical |
| FIG-QTE-01 | Quote block hygiene | `quote` dùng đúng mục đích, cân đối begin/end | quote chồng/lệch hoặc lẫn block không phải nguồn gây nhiễu audit | Medium |
| AST-SVG-01 | Asset validity | SVG figure render đúng, không lỗi literal | SVG chứa marker lỗi render (`Syntax error in text`) | Critical |
| LAY-OVR-01 | Layout overfull | Không có Overfull > 5pt | Có Overfull > 5pt | High |
| LAY-UND-01 | Layout underfull | Underfull ở ngưỡng chấp nhận, không gây vỡ đọc | Underfull dày đặc tại vùng nội dung chính | Medium |
| LAY-COVER-01 | Cover compliance | Cover khớp gần như tuyệt đối template | Sai lệch cấu trúc/khối chính so template | High |

## Evidence schema chuẩn

| Field | Meaning |
|---|---|
| issue_id | ID duy nhất (ISS-xxx) |
| rule_id | Rule áp dụng |
| severity | critical/high/medium/low |
| file | Đường dẫn file bằng chứng |
| line_or_range | line hoặc range |
| snippet | Trích đoạn tối thiểu |
| cross_refs | map sang `.tex/.log/.assets` |
| status | open/validated/false-positive |

## Deduplicate key

`rule_id + file + line_or_range + normalized_snippet_hash`

## Unresolved questions
- Với hình “dựa trên nguồn ngoài nhưng tự vẽ lại”, hội đồng có yêu cầu giữ dòng nguồn rút gọn hay bắt buộc citation đầy đủ kiểu IEEE ngay tại caption block?
