# 1) Context links
- Plan cũ: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260404-1738-sd-logging-firmware-esp32s3/plan.md`
- Research SD: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260406-1612-firmware-sdcard-rtc-esp32-loop/research/researcher-01-sd-card-sdmmc-strategy.md`
- Code: `.../main/src/sd_log_store.c`, `.../main/src/offline_queue.c`, `.../main/inc/pin_map.h`

# 2) Overview
- Priority: P1
- Status: completed
- Mục tiêu: ổn định mount lifecycle SDMMC + hardening ghi/đọc/meta theo fail-safe, không đổi format log.

# 3) Key Insights
- Hiện đã có mount/append/meta/gc nhưng lifecycle còn rời rạc.
- `offline_queue` retry mount có, nhưng thiếu state rõ `absent/degraded`.
- `PIN_SDMMC_CD` đã khai báo, cần khai thác nhất quán để giảm retry vô ích.

# 4) Requirements
- Functional:
  - Thiết lập state tối thiểu cho SD: `unavailable`, `mounted`, `degraded`.
  - Mount retry theo backoff, không block loop chính.
  - Append + fsync + meta update theo thứ tự bền vững.
  - Xử lý card rút nóng: dừng ghi, mark unavailable, không crash.
- Non-functional:
  - Không tăng complexity không cần thiết, không đổi định dạng record hiện tại.
  - Độ trễ replay không bị tăng đột biến do mount storm.

# 5) Architecture
- Giữ `sd_log_store` là storage boundary duy nhất.
- Bổ sung state nội bộ + error counter trong `sd_log_store` (không tạo tầng abstraction mới).
- `offline_queue` chỉ gọi API store và phản ứng theo `is_mounted` + error code.
- Rule durability: `append record -> fflush/fsync -> write meta`.

# 6) Related Code Files
- Modify:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/sd_log_store.c`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/offline_queue.c`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/pin_map.h` (chỉ nếu cần chỉnh mapping/CD)
- Create: none (ưu tiên sửa file hiện có)
- Delete: none

# 7) Implementation Steps
1. Chuẩn hóa state SD trong `sd_log_store` (mounted/unavailable/degraded tối thiểu).
2. Siết `sd_log_store_mount()` để phân biệt lỗi pin-map, no-card, mount-failed.
3. Chuẩn hóa retry window ở `offline_queue_try_mount()` với backoff hiện hữu.
4. Bổ sung xử lý rút thẻ giữa runtime: fail write -> mark unavailable -> retry sau.
5. Rà lại `gc_if_needed()` để an toàn file replace (tmp->rename) và lỗi fsync.
6. Bảo đảm `stop_session()` vẫn flush meta khi có mount; nếu không mount thì degrade nhẹ, không crash.

# 8) Todo List
- [ ] Chốt state enum/flag SD tối giản.
- [ ] Chốt semantics lỗi mount và log message chuẩn.
- [ ] Chốt hot-remove behavior.
- [ ] Chốt GC write path fail-safe.
- [ ] Cập nhật checklist unit/runtime cho SD lifecycle.

# 9) Success Criteria
- Boot với SD: mount thành công, meta đọc đúng.
- Không SD: firmware vẫn chạy bình thường, không flood log.
- Rút/gắn thẻ runtime: không reset bất thường, retry hồi phục đúng.
- 100+ lần append liên tiếp không hỏng file meta/log.

# 10) Risk Assessment
- Rủi ro: card detect không ổn định phần cứng -> false absent.
  - Giảm thiểu: fallback probe mount định kỳ khi CD không tin cậy.
- Rủi ro: fsync thường xuyên làm chậm.
  - Giảm thiểu: giữ fsync per-record cho critical; rawdata điều tiết theo soft quota.

# 11) Security Considerations
- Không ghi secrets vào SD payload/meta.
- Không dùng path động từ input ngoài để tránh path traversal.
- Parse line lỗi phải skip an toàn, không crash.

# 12) Next Steps
- Bàn giao output cho Phase 02 để gắn timestamp policy chuẩn.
- Chuẩn bị bench test card insert/remove trước khi vào integration loop.

## Unresolved questions
- Có cho phép bỏ qua CD pin hoàn toàn nếu board thực tế CD nhiễu không?
- Mức log chi tiết SD lỗi cần giữ ở INFO hay WARN để tránh log storm?
