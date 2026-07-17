# Firmware handoff 2026-05-01

## Phạm vi đang sửa dở

- Chuỗi boot có lỗi ngắt quãng `Interrupt wdt timeout` ở một số lần khởi động trong giai đoạn BLE/OBD và LTE bring-up.
- Mục tiêu là triệt tiêu race/blocking ở nhánh BLE connect và giảm rủi ro host task NimBLE bị nghẽn trong lúc modem/LTE cũng đang lên.

## Root cause nghi ngờ chính

- Scan callback của NimBLE có thời điểm kích hoạt connect quá sát ngay trong ngữ cảnh callback, dễ gây block/race khi BLE stack đang bận.
- Host task NimBLE có rủi ro stack/affinity chưa phù hợp trong các lần boot xấu.
- Giai đoạn BLE/OBD + LTE cùng bring-up làm tăng xác suất nghẽn scheduler hoặc watchdog nếu callback giữ lâu hơn dự kiến.

## Các file firmware đã sửa local

- `iot-vehicle-tracking-system-firmware/components/adapter-ble-obd-nimble/src/ble_mgr.c`
- `iot-vehicle-tracking-system-firmware/components/adapter-ble-obd-nimble/src/ble_init.c`
- `iot-vehicle-tracking-system-firmware/components/app-core/src/state_obd_runtime.c`
- `iot-vehicle-tracking-system-firmware/sdkconfig`

## Các thay đổi đã làm

- Đưa nhánh BLE connect sang deferred path trong `ble_mgr.c` để tránh connect quá sát trong scan callback.
- Align NimBLE host task core/stack theo config trong `ble_init.c`.
- Đổi guard skip autodiscover sang `CONFIG_TRACKER_FIELD_VALIDATION_SKIP_OBD_AUTODISCOVER`.
- Tăng `CONFIG_BT_NIMBLE_HOST_TASK_STACK_SIZE` local lên `6144`.

## Build và kiểm tra đã xong

- `idf.py build` đã pass sau các sửa trên.
- Chưa verify runtime thực tế trên board sau sửa vì chưa flash được ổn định khi thiết bị sleep/wake.

## Hạ tầng flash/wait hiện tại

- User đã yêu cầu tạm dừng flash ở lượt này.
- Không được hardcode COM vào script.
- Script skill `wait_and_flash.py` đã được sửa để:
  - retry qua nhiều chu kỳ wake/sleep,
  - không fail ngay sau một lần thử,
  - chỉ retry với lỗi serial dạng transient/retryable.
- Test cho script đã pass:
  - `pytest .codex/skills/esp32-loop-coding/scripts/tests/test_wait_and_flash.py -q`
  - kết quả `7 passed`.

## Chặn hiện tại

- Board đang sleep nên không thể ép flash ngay; cần dùng luồng wait-and-flash khi quay lại.
- Chưa có bằng chứng runtime cuối cùng trên thiết bị thật để xác nhận đã hết `Interrupt wdt timeout`.

## Khi quay lại firmware

1. Dùng skill `esp32-loop-coding`.
2. Giữ nguyên nguyên tắc không hardcode COM; detect động cổng đang có thiết bị.
3. Dùng wait-and-flash để canh board wake rồi flash.
4. Sau flash, monitor serial và xác nhận:
   - không còn `Interrupt wdt timeout`,
   - BLE/OBD connect không làm kẹt boot,
   - LTE bring-up vẫn hoàn tất,
   - log telemetry dùng `vehicle_battery` và `device_battery`,
   - OTA safety check tham chiếu `device_battery`.
