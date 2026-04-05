# ESP32 Loop Workflow

## Prerequisites

- ESP-IDF env đã activate.
- Firmware dir: `iot-vehicle-tracking-system-firmware`.
- Quyền truy cập serial port.
- Python có `pyserial`.

## Session start

1. Dò COM bằng `scripts/com_detector.py --json`.
2. Nếu 1 cổng: dùng luôn.
3. Nếu nhiều cổng: hỏi `AskUserQuestion` một lần đầu session, giữ COM đó cho tất cả vòng sau.
4. Chốt file log:
   - `iot-vehicle-tracking-system-firmware/documents/test-logs/com{N}-monitor-latest.log`

## Iteration

1. Monitor serial với `scripts/serial_reader.py`.
2. Dừng monitor khi:
   - thấy fatal pattern, hoặc
   - thấy hệ thống ổn định theo cửa sổ ổn định.
3. Phân tích log bằng `scripts/log_analyzer.py`.
4. Nếu `status=fatal` hoặc `unstable`:
   - sửa code trực tiếp theo tag/file gợi ý,
   - chạy build/flash: `idf.py -p <COM> build flash`.
5. Quay lại monitor để xác nhận sau fix.
6. Kết thúc khi `status=stable` liên tiếp theo tiêu chí task.

## Notes

- Luôn append log vào file `com{N}-monitor-latest.log` để giữ lịch sử.
- Không đổi COM giữa session trừ khi port mất kết nối.
- Ưu tiên fix nhỏ, đo lại ngay.
