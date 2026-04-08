# Research: chiến lược SD card / SDMMC cho ESP32-S3 tracker

## Phạm vi
- Mục tiêu: kết nối SD, đọc/ghi dữ liệu log, hoàn thiện luồng SD cho firmware tracker theo hướng tối giản.
- Không implement code.

## File đã đọc
- `main/src/sd_log_store.c`
- `main/src/offline_queue.c`
- `main/src/state_machine.c`
- `main/inc/pin_map.h`

## Điểm mạnh hiện tại
1. **Có tầng lưu trữ SD riêng**: mount/unmount, tạo thư mục, đọc/ghi meta, append log, peek replay, GC theo quota. `main/src/sd_log_store.c:129-344`
2. **Có replay queue ở mức ứng dụng**: giữ `session_id`, `next_seq`, `pending_msg_id`, `pending_seq`, backoff, retry mount SD. `main/src/offline_queue.c:18-29, 64-140, 185-254`
3. **Có phân luồng theo loại record**: raw/status/event/firmware map sang topic khác nhau, QoS 0/1 theo độ quan trọng. `main/src/offline_queue.c:33-50, 90-108`
4. **State machine đã gắn offline queue vào runtime**: publish raw/status/event/firmware đều đi qua queue, có replay tick trong driving mode. `main/src/state_machine.c:234-301, 673-745`
5. **Pin map SDMMC đã có đủ tín hiệu chính**: CLK/CMD/D0-D3 + CD, WP đểnếu cần. `main/inc/pin_map.h:54-74`

## Gap cần làm để “kết nối + đọc data + hoàn thiện tính năng SD”
1. **Mount lifecycle còn rời rạc**
   - `sd_log_store_mount()` chỉ được gọi theo retry khi enqueue/replay; chưa có state rõ cho card present / mount failed / disabled.
   - Chưa thấy cơ chế unmount an toàn khi sleep hoặc khi card rút đột ngột.
2. **Replay pointer chưa đủ bền**
   - Meta có `write_seq`, `replay_seq`, `ack_seq_critical`, `session_id`, `clean_shutdown`, nhưng logic replay chủ yếu dựa vào file scan + seq.
   - Khi write fail / GC / reboot giữa chừng, cần bảo đảm pointer không quay lui hoặc bỏ sót record.
3. **GC/quota còn đơn giản**
   - GC chỉ xóa record non-critical đã ack, dựa trên `ack_seq_critical`. `main/src/sd_log_store.c:281-327`
   - Chưa có chính sách xử lý “SD gần đầy nhưng replay backlog lớn” ngoài throttle rawdata.
4. **Fail-safe chưa rõ khi SD lỗi kéo dài**
   - Hiện queue bỏ qua append nếu mount fail rồi vẫn return OK; điều này tốt cho online continuity nhưng dễ làm mất log nếu người dùng kỳ vọng durability.
   - Cần phân biệt “best-effort telemetry” vs “must-save critical record”.
5. **Đọc data còn phụ thuộc file text scan**
   - `peek_next()` đọc tuần tự file log. Với log lớn, replay sẽ chậm. `main/src/sd_log_store.c:253-279`
6. **Card detect/wiring chưa được khai thác hết**
   - `PIN_SDMMC_CD` có trong pin map, nhưng chưa thấy lớp trạng thái card-present được dùng ở queue/state machine. `main/inc/pin_map.h:67-70`

## Kiến trúc tối giản đề xuất
### 1) Mount lifecycle
- Trạng thái: `disabled -> absent -> mounted -> degraded`.
- `absent`: chưa có SD hoặc CD báo rút; không mount lại quá nhanh.
- `mounted`: cho phép append/replay.
- `degraded`: mount lỗi liên tiếp; chỉ retry theo backoff.
- Khi sleep/shutdown: flush meta + stop session + unmount có kiểm soát.

### 2) Record durability
- Giữ format text hiện tại để tránh thay đổi lớn.
- Luồng ghi:
  1. append record
  2. fsync
  3. cập nhật meta (write_seq/replay_seq/session)
- Critical record vẫn phải ưu tiên ghi; rawdata có thể drop khi quota/SD lỗi.

### 3) Replay pointer
- Chỉ một pointer “nguồn sự thật”: `replay_seq` trong meta.
- `pending_seq` chỉ là runtime state, mất khi reboot cũng không sao.
- Sau ack QoS1: advance `ack_seq_critical` + `replay_seq`.
- Khi scan file gặp seq đã ack thì skip, không lùi pointer.

### 4) Quota GC
- 2 ngưỡng:
  - soft quota: throttle rawdata.
  - hard quota: GC non-critical đã ack.
- GC giữ nguyên critical chưa ack và mọi record mới hơn `ack_seq_critical`.
- Nếu GC không giải phóng đủ, chuyển sang degraded mode và chỉ ghi critical.

### 5) Error handling fail-safe
- Mount fail: log 1 lần theo backoff, không block main FSM.
- Append fail: tăng counter, thử remount ở tick sau.
- Parse fail khi replay: skip line hỏng, không crash, không reset pointer lui.
- Nếu card present mất: mark absent, unmount ngay, không tiếp tục fsync.

## Validation checklist thực tế
### Compile / build gates
- [ ] Build firmware ESP32-S3 sau khi sửa SD layer.
- [ ] Bảo đảm không có warning/error mới ở module SD/offline queue/state machine.
- [ ] Kiểm tra include path + pin map không vỡ build.

### Bench / runtime gates
- [ ] Boot với SD gắn sẵn: mount thành công, meta đọc đúng.
- [ ] Rút/gắn SD khi đang chạy: không crash, log chuyển absent/mounted đúng.
- [ ] Ghi 100+ record liên tục: fsync OK, replay_seq tiến đúng.
- [ ] Mô phỏng mất mạng rồi có mạng lại: replay đúng thứ tự, không trùng ack critical.
- [ ] Quota đầy: rawdata bị throttle trước, GC chạy sau, critical vẫn còn.
- [ ] Reboot giữa chừng: meta vẫn khớp, không lùi pointer.

### Test / logic gates
- [ ] Unit test parser record line hỏng / thiếu field.
- [ ] Test GC giữ critical chưa ack.
- [ ] Test backoff remount tăng dần và giới hạn trần.
- [ ] Test replay skip record đã ack.

## Kết luận ngắn
- Nền tảng hiện tại đã đủ để làm SD logging/replay thật, không cần redesign lớn.
- Hướng tốt nhất: thêm state machine mount rõ ràng, làm bền replay pointer, và siết fail-safe/quota.
- Ưu tiên giữ KISS: text log + meta nhỏ + replay scan tuần tự, chưa cần binary index hay DB nhúng.

## Unresolved questions
- Có yêu cầu SD phải là “must-save” cho rawdata hay chỉ critical/event/status?
- Board thực tế có CD pin hoạt động ổn định không, hay nên mount bỏ qua CD và chỉ dựa vào probe?
- Cần replay cả rawdata khi có mạng lại, hay chỉ critical/status/event/firmware?
- Muốn GC giữ bao nhiêu ngày record, hay chỉ theo quota hiện tại là đủ?
