# TOEIC 650 — Kiểm kê cấu trúc & Đề xuất tái cấu trúc

## A. BẢN ĐỒ HIỆN TẠI (đã kiểm kê toàn bộ, không sót)

### Trang gốc: "TOEIC 650 - Trung tâm học" (356df50b…218a, nằm ở top-level workspace)
Các block trực tiếp:
1. Callout 🎯 giới thiệu.
2. H2 "1. Học mỗi ngày" → link page **Học Mỗi Ngày**.
3. H2 "2. Học nhanh trên điện thoại" → link page **Luồng học trên điện thoại**.
4. H2 "3. Xem toàn bộ lộ trình" → link page **Bảng lộ trình ngữ pháp**.
5. H2 "Cách học 1 bài cho đúng nhịp" — 5 bước (LỖI THỜI: Hiểu nhanh / Nhìn phát nhận ra / Tự làm trước / Đáp án + bẫy).
6. H2 "Gợi ý rất ngắn cho hôm nay" — 3 to-do.
7. TOGGLE "Kho dữ liệu và trang mở rộng" — đổ chung ~34 mục (xem dưới).

### Bên trong toggle "Kho dữ liệu" — phân loại:
**DB nguồn thật (11):**
- Bài học TOEIC (e79e3187) — 15 dòng — bài kỹ năng/chiến lược (Listening/Reading/Vocab); là DB mà nhiều bảng khác relate tới.
- Ngân hàng câu hỏi TOEIC (d94e5d28) — 91.
- Ngân hàng từ vựng TOEIC (eb1c9213) — 83.
- Sổ lỗi sai TOEIC (a71fef25) — 10.
- Đề mô phỏng TOEIC (ab59ae9f) — 4.
- Hàng đợi ôn tập TOEIC (81b35566) — 13.
- Lộ trình 8 tuần TOEIC 650 (4e20871e) — 8.
- Bộ luyện TOEIC (d7cc2040) — 15.
- Theo dõi kỹ năng TOEIC (14c2084d) — 14.
- Nhật ký buổi học TOEIC (9a898f19) — 3.
- **TOEIC 650 - Lộ trình ngữ pháp (b1b4de15) — 35** — 35 bài ngữ pháp (bộ tôi vừa dựng lại).

**Linked view trùng lặp ("Untitled") nằm rải trong toggle (9 cái):** số dòng = bản sao của DB thật (15, 91, 13, 91, 83, 8, 15, 14, 3). → bảng nhúng, không phải dữ liệu mới.

**Trang con (pages):**
- Chiến lược điểm số và sơ đồ đề thi TOEIC 650 — nội dung thật (cấu trúc đề, timing, review rule, nguồn ETS/IIBC).
- Luồng học trên điện thoại — hướng dẫn học nhanh; bên trong có toggle "Các bảng mở rộng" chứa 4 linked view nữa (15,91,91,83).
- Ghi chú nghiên cứu - phiên bản 3 — ghi chú thiết kế nội bộ ("không cần khi học").
- Bảng lộ trình ngữ pháp — liệt kê 12 chương + toggle "Mở bảng dữ liệu" chứa 3 linked view của DB 35 bài.
- TOEIC 650 - Học Mỗi Ngày — lối vào học; gợi ý theo chương + toggle "Mở theo từng chương" liệt kê 12 chương.
- Chương 1…12 — mỗi trang liệt kê tay 2–4 bài (link tới trang bài trong DB 35).

## B. VẤN ĐỀ CỐT LÕI
1. **Ba lối điều hướng song song** tới cùng 35 bài: Học Mỗi Ngày → 12 trang Chương → bài; Bảng lộ trình → view DB; và 12 trang Chương đứng riêng. → "lòng vòng".
2. **Hai hệ lưu 35 bài**: database (b1b4de15) và 12 trang Chương chép tay. Sửa 1 nơi lệch nơi kia.
3. **Hai DB bài học khác nhau** dễ nhầm: "Bài học TOEIC" (15, kỹ năng) vs "Lộ trình ngữ pháp" (35, ngữ pháp).
4. **9+ linked view "Untitled"** lặp ở 3 nơi → kho nhìn rối, không biết bấm cái nào.
5. **Hướng dẫn nhịp học lỗi thời** (Hiểu nhanh/Nhìn phát/Tự làm trước/Đáp án+bẫy) ở 3 trang, KHÔNG khớp bố cục bài mới (Phần → 📖 Lý thuyết & ví dụ → Luyện tập → Mini Test).
6. **Thuộc tính DB dư**: Trạng thái (đã có "Đã vững") + checkbox "Đã vững" + "Hợp điện thoại".
7. **Ghi chú nghiên cứu v3** = nội bộ, không nên nằm trong hub học.

## C. CẤU TRÚC MỚI ĐỀ XUẤT (3 lớp, một nguồn duy nhất)

### Lớp 1 — HUB (1 trang "TOEIC 650 - Trung tâm học")
Dashboard gọn, không đổ DB thô:
- Callout: "Bắt đầu ở đây. Mỗi ngày mở mục Học hôm nay, học 1 bài, đổi Trạng thái."
- **▌ HỌC NGỮ PHÁP (lộ trình chính)** — nhúng 1 linked view của DB 35 bài: group theo Chương, sort Thứ tự; kèm view "📱 Điện thoại" và view "🔁 Cần ôn". Thay thế cả 3 trang lối vào.
- **Nhịp học 1 bài (đã cập nhật)**: 📖 Lý thuyết & ví dụ → ✍️ Luyện tập từng phần → 🏋️ Mini Test → đổi Trạng thái (Đang học / Cần ôn / Đã vững).
- **▌ Mục lục tài nguyên** (nhóm rõ, mỗi nhóm 1 link tới DB gốc, KHÔNG nhúng trùng):
  - Luyện & Thi: Bộ luyện · Ngân hàng câu hỏi · Đề mô phỏng
  - Từ vựng: Ngân hàng từ vựng
  - Ôn tập & Sửa lỗi: Hàng đợi ôn tập · Sổ lỗi sai
  - Theo dõi & Kế hoạch: Theo dõi kỹ năng · Nhật ký buổi học · Lộ trình 8 tuần
  - Chiến lược: trang Chiến lược điểm số

### Lớp 2 — HỌC: chỉ DB "Lộ trình ngữ pháp" (b1b4de15) làm nguồn duy nhất
- Tạo sẵn các view: "Lộ trình (theo chương)", "📱 Điện thoại", "🔁 Cần ôn", "Tất cả".
- **Bỏ** 12 trang Chương 1–12 và mọi danh sách chương chép tay (thay bằng group-by-Chương của view).

### Lớp 3 — TÀI NGUYÊN
- Giữ 11 DB nguồn, gom nhóm như trên.
- Làm rõ 2 DB bài học: đổi tên "Bài học TOEIC" → "Bài kỹ năng & chiến lược" để phân biệt với "Lộ trình ngữ pháp (35 bài)".

### Dọn dẹp (chuyển Thùng rác Notion, khôi phục được 30 ngày)
- Toàn bộ linked view "Untitled" (9 trong hub + 4 trong Luồng điện thoại + 3 trong Bảng lộ trình).
- 12 trang Chương 1–12.
- Trang "Bảng lộ trình ngữ pháp" và "Luồng học trên điện thoại" (thay bằng view ngay trên hub) — HOẶC giữ "Luồng điện thoại" nếu muốn trang mobile riêng (cần bạn quyết).
- "Ghi chú nghiên cứu - phiên bản 3" → đưa ra ngoài hub (hoặc archive).

### Gọn database 35 bài
- Bỏ checkbox "Đã vững" (trùng với Trạng thái) và "Hợp điện thoại" nếu không dùng.
- Giữ: Trạng thái / Chương / Thứ tự / Mức / Phút / Trọng tâm TOEIC.

## E. MÔ HÌNH HỌC KHOA HỌC (từ nghiên cứu + cách app làm)

### Nguyên lý đã kiểm chứng → đối chiếu app
- **Spaced repetition (lặp lại ngắt quãng)**: ôn ở khoảng cách tăng dần 1→3→7→14→30 ngày; sai thì reset về 1. Duolingo xếp thứ tự bài theo SRS; Anki/Leitner dùng "đúng → giãn ra, sai → về đầu". Giữ nhớ tốt hơn 200–400% so với học dồn.
- **Retrieval practice / active recall**: tự nhớ/tự làm TRƯỚC khi xem đáp án (bài đã làm đúng: tự làm → mở toggle).
- **Interleaving (trộn chủ đề)**: xen kẽ nhiều dạng thay vì cày 1 dạng → phân biệt tốt hơn (mixed set).
- **Mastery learning**: chỉ lên bài mới khi bài cũ đã vững.
- **Diagnostic-first (chẩn đoán trước)**: Santa TOEIC test 3 phút → phân tích điểm yếu theo Part → gợi ý lộ trình; AlphaTest 20 câu + "Weakness Conqueror".
- **Habit/streak/goal**: Duolingo đặt mục tiêu thời gian/ngày → chuỗi streak + tiến độ nhìn thấy được.
- **Error-driven**: câu sai được ôn lại dày hơn (Duolingo tự đẩy câu sai lên).

### Workspace của bạn ĐÃ có sẵn bộ máy này (chỉ chưa nối lại)
- Hàng đợi ôn tập: có Next Interval **1/3/7/14/30 ngày** + Due Date + Confidence = **đúng SRS**.
- Sổ lỗi sai: Confidence + Marked for Review = **error-driven**.
- Theo dõi kỹ năng: Status Weak→Strong + Priority = **bản đồ điểm yếu**.
- Đề mô phỏng: có sẵn **DX-00 30-Min Diagnostic** = chẩn đoán.
- Lộ trình ngữ pháp: Trạng thái Khóa→Bắt đầu→Đang học→Cần ôn→Đã vững = **mastery gating**.
- Nhật ký buổi học: Date + Minutes + Done = **streak/goal**.
- Bộ luyện: Part "Mixed" = **interleaving**.

### Vòng học chuẩn (gắn nguyên lý vào)
0. (1 lần) Làm DX-00 chẩn đoán → đặt mục tiêu + đánh dấu điểm yếu (Theo dõi kỹ năng).
1. HỌC 1 bài mới theo lộ trình (mastery-gated) — active recall trong bài.
2. LUYỆN 1 set trộn (Bộ luyện / Ngân hàng câu hỏi) — interleaving.
3. GHI lỗi sai → Sổ lỗi sai (Confidence Low / Marked).
4. LÊN LỊCH ôn → tạo item Hàng đợi ôn tập, Due theo SRS.
5. ÔN các item ĐẾN HẠN hôm nay → đúng: giãn interval; sai: về 1 ngày.
6. CẬP NHẬT Trạng thái bài + Theo dõi kỹ năng + ghi Nhật ký (streak).

Quy ước "Đã vững": chỉ tick khi Mini Test ≥ 13/16 **và** đã qua được ít nhất 1 lần ôn cách quãng.

### Hub khoa học — thêm khối "🎯 HỌC HÔM NAY" lên đầu (3 view lọc sẵn)
- **Đến hạn ôn (SRS)** = Hàng đợi ôn tập, lọc Due ≤ hôm nay (đây là thứ quan trọng nhất, hiện đang bị chôn).
- **Bài mới tiếp theo** = Lộ trình ngữ pháp, lọc Trạng thái ∈ {Bắt đầu, Đang học}, sort Thứ tự.
- **Điểm yếu ưu tiên** = Theo dõi kỹ năng, lọc Status = Weak, sort Priority.
Kèm 1 bảng nhỏ "Luật ôn (SRS)" và callout "Người mới: làm bài chẩn đoán trước".

## D. CẦN BẠN QUYẾT
1. Bỏ 12 trang Chương → thay bằng view group-by-Chương? (khuyến nghị: CÓ)
2. Gộp 3 trang lối vào vào hub, hay giữ riêng trang "Luồng điện thoại"?
3. Đổi tên "Bài học TOEIC" (15) cho khỏi nhầm với "Lộ trình ngữ pháp" (35)?
4. Có bỏ 2 checkbox dư trong DB 35 bài không?
