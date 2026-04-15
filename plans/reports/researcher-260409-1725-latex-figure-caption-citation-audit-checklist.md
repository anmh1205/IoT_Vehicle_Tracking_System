# Research Report: Audit checklist LaTeX cho caption/nguồn hình/citation

- Thời điểm nghiên cứu: 2026-04-09 17:25 (Asia/Saigon)
- Phạm vi: luận văn tiếng Việt dùng LaTeX; tập trung hình/caption/nguồn hình/footnote/citation nhất quán.
- Nguyên tắc: KISS, DRY, audit pass/fail rõ ràng, truy vết theo line-number.

## 1) Checklist pass/fail (audit-level)

### A. Caption hình
- [PASS] Mọi `figure` đều có đúng 1 `\caption{...}`; [FAIL] thiếu caption hoặc >1 caption.
- [PASS] Caption đặt sau `\includegraphics` (nhất quán toàn luận văn); [FAIL] trộn trước/sau tùy ý.
- [PASS] Caption có thông tin mô tả tối thiểu: đối tượng + ngữ cảnh (không chỉ “Hình minh họa”); [FAIL] caption rỗng/không mang nghĩa.
- [PASS] Không chèn `Nguồn:` trực tiếp trong `\caption{}`; [FAIL] caption kiêm luôn nguồn.
- [PASS] Label đúng chuẩn và duy nhất: `\label{fig:<slug>}`; [FAIL] trùng label/sai prefix.

### B. Nguồn hình (tách khỏi caption)
- [PASS] Mỗi hình có nguồn theo đúng 1 trong 2 mẫu:
  - **Hình tự vẽ**: dòng chuẩn hóa ngay dưới hình: `\textit{Nguồn: Tác giả tự tổng hợp/vẽ.}`
  - **Hình ngoài**: dòng chuẩn hóa: `\textit{Nguồn: <Tác giả/Tổ chức>, <năm>, [<id citation>].}`
- [PASS] Dòng nguồn đặt ngoài `\caption`, ngay sau `\caption` (hoặc block macro nguồn chuẩn nếu có); [FAIL] đặt rải rác khó audit.
- [PASS] Hình ngoài bắt buộc có citation map tới `.bib` (hoặc hệ tham chiếu đang dùng); [FAIL] ghi URL/text trần không citation key.
- [PASS] Nếu ảnh chỉnh sửa từ nguồn ngoài, ghi rõ: `Nguồn: chỉnh sửa từ ...`; [FAIL] không khai báo mức độ chỉnh sửa.
- [PASS] URL trong nguồn ngoài có ngày truy cập (nếu là web volatile); [FAIL] thiếu accessed date.

### C. Phân loại hình tự vẽ vs lấy nguồn ngoài
- [PASS] Mỗi hình có cờ phân loại duy nhất: `self-produced` hoặc `external` (audit bằng rule text); [FAIL] mơ hồ/không phân loại.
- [PASS] `self-produced` không đi kèm citation ngoài (trừ khi “dựa trên”); [FAIL] tự vẽ nhưng gắn nguồn ngoài không rõ quan hệ.
- [PASS] `external` luôn có ít nhất 1 citation hợp lệ; [FAIL] external không có key tham chiếu.
- [PASS] Danh mục hình (list of figures) không chứa text nguồn; [FAIL] nguồn lẫn vào mục lục hình gây bẩn format.

### D. Footnote/Citation nhất quán
- [PASS] Chọn 1 chuẩn duy nhất cho toàn luận văn (ví dụ: citation qua `\cite{}`; footnote chỉ cho ghi chú ngoài học thuật); [FAIL] đoạn thì footnote nguồn, đoạn thì cite key tùy hứng.
- [PASS] Không dùng footnote để thay citation học thuật chính (trừ style trường yêu cầu); [FAIL] lạm dụng footnote làm nguồn chính.
- [PASS] Cùng một nguồn dùng cùng một citation key, không tạo key trùng nội dung khác tên; [FAIL] trùng nguồn-nhiều key.
- [PASS] Không trộn nhiều cú pháp citation không tương thích trong cùng tài liệu (`natbib` + `biblatex` lẫn lộn); [FAIL] mix stack.

## 2) Quy trình thu thập line-number không sót (.tex)

1. **Chốt phạm vi file**: liệt kê toàn bộ `*.tex` của luận văn (main + chapter + appendix).
2. **Định nghĩa pattern audit** (regex-level):
   - Figure block: `\\begin\{figure\}` ... `\\end\{figure\}`
   - Caption: `\\caption\{`
   - Label: `\\label\{fig:`
   - Source line: `Nguồn:`
   - Citation token: `\\cite`, `\\parencite`, `\\textcite`, `\\footnote\{`
3. **Quét block theo thứ tự line tăng dần**: với mỗi `figure`, ghi:
   - file, line bắt đầu/kết thúc figure
   - line caption, label, source
   - cờ `self-produced/external`
   - có/không citation key
4. **Rule kiểm chéo bắt buộc**:
   - figure có caption?
   - figure có source line?
   - source loại external có citation?
   - label duy nhất?
5. **Chống sót do macro**:
   - kiểm tra macro tự định nghĩa kiểu `\figsource{}` / `\myfigure{}`.
   - nếu có macro, audit cả nơi định nghĩa macro + nơi gọi macro.
6. **Sinh bảng lỗi chuẩn** (CSV/Markdown): `severity | file | line | rule_id | evidence | fix_hint`.
7. **Re-run sau chuẩn hóa**: quét lại cùng rule-set; chỉ pass khi lỗi critical/high = 0.

## 3) Đánh dấu mức độ lỗi

- **Critical**
  - Hình external không nguồn/citation.
  - Trùng label gây reference sai.
  - Trích dẫn không truy vết được về tài liệu tham khảo.
- **High**
  - Có nguồn nhưng sai loại (ví dụ external ghi như tự vẽ).
  - Nguồn nằm trong caption làm sai chuẩn trình bày đã chọn.
  - Trộn 2 hệ citation gây output không nhất quán.
- **Medium**
  - Thiếu năm/tác giả/ngày truy cập cho web source.
  - Caption thiếu ngữ cảnh, quá mơ hồ.
  - Không ghi “chỉnh sửa từ” khi ảnh đã biến đổi.
- **Low**
  - Vi phạm style nhỏ: in nghiêng/định dạng dấu câu/spacing.
  - Không thống nhất viết “Nguồn” vs “Nguồn:”.

## 4) Rủi ro thường gặp khi chuẩn hóa citation luận văn tiếng Việt

- Việt hóa dấu câu làm vỡ cú pháp citation macro (đặc biệt khi copy-paste từ Word).
- Mã hóa Unicode + BibTeX/Biber không đồng nhất -> lỗi tên tác giả tiếng Việt.
- Nguồn web thiếu metadata (tác giả, năm), dẫn đến citation yếu.
- Trộn quy định khoa/bộ môn với template có sẵn (xung đột style).
- Ảnh “tự vẽ dựa trên nguồn” không ghi rõ mức độ kế thừa, dễ bị đánh giá đạo văn trình bày.
- Refactor chapter làm đổi line-number, báo lỗi audit cũ mất tác dụng nếu không snapshot theo commit.

## 5) Checklist triển khai nhanh (đưa cho auditor)

- [ ] Đếm tổng số `figure`.
- [ ] 100% figure có `caption + label + source`.
- [ ] 100% external figure có citation key hợp lệ.
- [ ] 0 lỗi Critical, 0 lỗi High trước nộp.
- [ ] Một chuẩn citation duy nhất toàn luận văn.
- [ ] Re-audit sau lần sửa cuối cùng.

## Unresolved questions
- Trường/khoa yêu cầu style nào cụ thể (IEEE, APA, TCVN nội bộ, hay template riêng)?
- Cho phép đặt nguồn hình bằng footnote hay bắt buộc dòng `Nguồn:` ngay dưới hình?
- Có chấp nhận ảnh chụp màn hình phần mềm/tài liệu có bản quyền nếu chỉ ghi nguồn, hay cần thêm giấy phép?
