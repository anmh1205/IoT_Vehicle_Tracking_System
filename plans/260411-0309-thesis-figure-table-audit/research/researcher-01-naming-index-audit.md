# Audit naming/index figure-table

- Thời điểm rà soát: 2026-04-11 03:09 Asia/Saigon
- Phạm vi: `resources/reports/thesis/final/thesis-final-report.tex`, `resources/reports/thesis/final/assets/figures`
- Cách làm: grep caption/index trong `.tex`, đối chiếu danh sách asset thực tế trong `assets/figures`

## 1) Quy ước tên asset hiện tại

Quan sát từ `resources/reports/thesis/final/assets/figures`:

- Mẫu chính: `NN-chuong-M-<khoi-noi-dung>-hinh-X-Y[a].{png,svg}`
- `NN` = block asset tuần tự theo thư mục, không phải số chương luận văn.
- `chuong-M` = chương logic trong luận văn.
- `<khoi-noi-dung>` = nhóm nội dung con, ví dụ:
  - `gioi-thieu` cho chương 1
  - `phan-tich` cho chương 2
  - `giai-phap-phan-cung` / `giai-phap-firmware` / `giai-phap-backend` / `giai-phap-frontend` cho chương 3
  - `trien-khai-hardware` cho một phần chương 4
- Phần cuối `hinh-X-Y[a]` bám theo số caption, ví dụ:
  - `...-hinh-3-1.png`
  - `...-hinh-3-1a.png`
  - `...-hinh-4-2a.png`
- Mỗi hình thường có cặp `.svg` + `.png` cùng basename.

Nhận xét ngắn:

- Quy ước tên file asset khá rõ ở mức figure.
- Nhưng taxonomy đang trộn 2 lớp đánh số: `NN-...` theo block thư mục và `hinh-X-Y[a]` theo caption.
- Chương 3 chia block tốt; chương 4 chưa phủ hết toàn bộ hình theo caption list.

## 2) Mismatch giữa caption/index và tên file/khối chương

### 2.1. List of Tables không khớp với body table captions

`resources/reports/thesis/final/thesis-final-report.tex:722-732` liệt kê LoT:
- Bảng 2.1, 2.2, 2.3
- Bảng 3.1 .. 3.5
- Bảng 4.1
- Bảng 5.1, 5.2

Nhưng body captions thực tế có nhiều số khác:
- Chương 1 có `Bảng 1.1`, `1.3.1A`, `1.2`, `1.2A`, `1.2B`, `1.2C` tại `...tex:1154,1188,1208,1213,1235,1256`
- Chương 2 có `Bảng 2.1`..`2.6` và `2.3.4A` tại `...tex:1721,1763,1812,1864,2112,2148,2244`
- Chương 3 có rất nhiều bảng `3.1`..`3.29`, plus suffix/decimal hybrids như `3.14A`, `3.5A`, `3.2.2A`..`3.2.2K`, `3.15A`, `3.18A`, `3.23A`, `3.2.4A`, `3.2.4B` tại `...tex:2379-5604`
- Chương 4 có `4.1.1A`, `4.1`..`4.11`, rồi bị tái dùng `4.5`, `4.6`, `4.7`, `4.8` nhiều lần ở block khác tại `...tex:5757,5897,6022,6040,6063,6082,6104,6135,6289,6339,6567,6680,6711,6917,7079,7297,7389,7410,7759,8015,8168,8261,8393`

Kết luận: phần `DANH MỤC BẢNG` đang là index tĩnh/cũ, không phản ánh caption thật trong thân tài liệu.

### 2.2. List of Figures không khớp phạm vi asset thực tế

`resources/reports/thesis/final/thesis-final-report.tex:747-870` liệt kê hình từ `Hình 1.1` tới `Hình 4.47`.

Assets thực tế trong `resources/reports/thesis/final/assets/figures` đang phủ tốt:
- Chương 1: `Hình 1.1`..`1.5`
- Chương 2: `Hình 2.1`
- Chương 3: `Hình 3.1`..`3.23`, gồm suffix `a`
- Chương 4: mới thấy nhóm hardware `Hình 4.1`..`4.16` và `4.1a`, `4.2a`

Mismatch rõ:
- LoF/body có `Hình 4.16a` tại `...tex:821,7228`
- LoF/body có `Hình 4.17`..`Hình 4.47` tại `...tex:823-870`
- Nhưng tên asset glob thấy mới đến block `07-chuong-4-trien-khai-hardware-hinh-4-16[a].*`; không thấy coverage tương ứng cho `4.17`..`4.47`

Kết luận: chapter 4 đang lệch giữa caption plan và inventory asset. Hoặc thiếu asset, hoặc asset nằm ngoài taxonomy hiện tại, hoặc body dùng hình không đi qua thư mục `assets/figures` này.

### 2.3. Mismatch giữa caption index và khối chương

- Chương 3 asset naming chia block hợp lý theo domain:
  - `03-chuong-3-giai-phap-phan-cung-*`
  - `04-chuong-3-giai-phap-firmware-*`
  - `05-chuong-3-giai-phap-backend-*`
  - `06-chuong-3-giai-phap-frontend-*`
- Chương 4 hiện mới thấy block:
  - `07-chuong-4-trien-khai-hardware-*`
- Nhưng captions chương 4 sau `Hình 4.16a` đã chuyển sang firmware/cloud/backend/frontend/testing (`...tex:7228,7462,7522,7612,7815,8162,8485` và tiếp tục tới `4.47` trong `...tex:823-870`), không có block asset tương ứng theo cùng taxonomy.

Kết luận: taxonomy tên file asset đang tốt ở chương 3, nhưng chưa mở rộng đồng bộ cho các block chương 4.

## 3) Các đoạn đánh số tay bất nhất

Các mẫu bất nhất nổi bật:

- `Bảng 1.2A`, `1.2B`, `1.2C` tại `...tex:1213,1235,1256`
  - Trong khi ngay trước đó có `Bảng 1.2` tại `...tex:1208`
  - Nhưng còn có `Bảng 1.3.1A` tại `...tex:1188`, tức lẫn 2 kiểu: suffix chữ sau số chính và suffix chữ sau số phân cấp sâu.

- `Bảng 2.3.4A` tại `...tex:2112`
  - Lệch với chuỗi trước/sau đang là `Bảng 2.4`, `2.5`, `2.6` tại `...tex:1864,2148,2244`

- `Bảng 3.2.2A`..`3.2.2K` tại `...tex:3286,3560,3600,3653,3692,3766,3805,3928,3952,4016,4203`
  - Đây là numbering tay theo subsection, khác hẳn chuỗi chuẩn `Bảng 3.1`..`3.29`

- `Bảng 3.5A`, `3.14A`, `3.15A`, `3.18A`, `3.23A` tại `...tex:3218,3112,4251,4585,5003`
  - Trộn suffix chữ vào giữa một hệ vốn đang tăng tuần tự.

- `Bảng 3.2.4A`, `3.2.4B` tại `...tex:5380,5512`
  - Lại là kiểu số phân cấp subsection + hậu tố chữ, không đồng nhất với `Bảng 3.27`, `3.28`, `3.29` xung quanh.

- `Bảng 4.1.1A` tại `...tex:5757`
  - Khác kiểu với `Bảng 4.1` ngay sau đó tại `...tex:5897`

- Chương 4 còn bị tái sử dụng cùng số bảng ở nhiều khối:
  - `Bảng 4.6` tại `...tex:6104,6289,6680,8015`
  - `Bảng 4.7` tại `...tex:6135,6339,6711,8168`
  - `Bảng 4.8` tại `...tex:6917,8261`
  - `Bảng 4.5` tại `...tex:6082,6567,7759`

Kết luận: bảng đang dùng numbering thủ công, không có một grammar thống nhất.

## 4) Đề xuất taxonomy naming chuẩn cho bước sửa sau

Mục tiêu: bỏ ambiguity, bám chapter + block + index thật, không trộn nhiều hệ số.

### 4.1. Taxonomy đề xuất cho file asset

Mẫu tối giản:

`chuong-<chapter>-<block>-hinh-<major>-<minor><suffix>.<ext>`

Ví dụ:
- `chuong-3-firmware-hinh-3-10.svg`
- `chuong-3-backend-hinh-3-12a.png`
- `chuong-4-frontend-hinh-4-22.png`
- `chuong-4-testing-hinh-4-41.png`

Nếu cần giữ thứ tự export thư mục, thêm prefix block nhưng không coi là semantic chính:

`04-chuong-3-firmware-hinh-3-10.svg`

### 4.2. Block slug chuẩn hóa

Đề xuất block cố định, ngắn, đủ nghĩa:
- `gioi-thieu`
- `phan-tich`
- `hardware`
- `firmware`
- `backend`
- `frontend`
- `deployment`
- `testing`
- `results`

Không dùng slug quá dài kiểu `giai-phap-phan-cung`, `trien-khai-hardware` nếu cùng repo còn có chương 4 hardware; chỉ cần block semantic ổn định.

### 4.3. Quy tắc index nên chốt

- Figure: chỉ dùng `Hình X.Y` + optional `a`, `b` khi là biến thể cùng hình.
- Table: chỉ dùng `Bảng X.Y` + optional `a`, `b` nếu bất khả kháng.
- Không dùng kiểu `1.3.1A`, `3.2.2A`, `4.1.1A` cho caption chính.
- Nếu cần bảng phụ theo subsection, encode subsection vào label nội bộ, không encode vào caption hiển thị.

### 4.4. Mapping nên có ở bước sửa sau

- 1 caption index -> 1 basename asset.
- 1 block chương -> 1 prefix slug thống nhất.
- Tách riêng audit cho figure và table index; rebuild LoF/LoT từ caption thật, không duy trì danh mục gõ tay.

## Kết luận ngắn

- Figure asset naming hiện tại đủ đọc được, mạnh nhất ở chương 3.
- List of Tables đang lệch nặng với body captions.
- Chapter 4 captions đi xa hơn inventory asset hiện có trong `assets/figures`.
- Nguồn gốc lỗi chính: đánh số tay + taxonomy block không phủ đều toàn bộ chương.

## Unresolved questions

- `Hình 4.17`..`4.47` có asset ở thư mục khác hay chưa được xuất vào `assets/figures`?
- LoF/LoT hiện là block gõ tay cố định hay lấy từ macro tùy biến nào khác ngoài các dòng grep được?
- Có yêu cầu giữ hậu tố `A/B/C` trong caption hiển thị vì quy định trường/khoa không?