---
name: esp32-loop-coding
description: "Chạy loop debug ESP32 firmware: tự dò COM, monitor serial đến lỗi/ổn định, phân tích log, sửa code, build+flash, cập nhật test log liên tục."
license: MIT
version: 1.0.0
---

# ESP32 Loop Coding

## Overview

Kích hoạt skill này khi cần vòng lặp debug firmware ESP32 theo chu kỳ: monitor serial -> phân tích lỗi -> sửa code -> build/flash -> monitor lại. Trên Windows, chạy lệnh ESP-IDF qua PowerShell/CMD (không dùng Git Bash cho `idf.py`).

## When to use

Kích hoạt khi yêu cầu có một trong các ý sau:
- "loop debug", "flash rồi đọc serial lại", "fix tới khi boot ổn định"
- Cần ghi log monitor liên tục vào `iot-vehicle-tracking-system-firmware/documents/test-logs/`
- Cần chọn COM thông minh: tự dò, chỉ hỏi khi nhiều cổng

## Session bootstrap

1. Xác định thư mục firmware: `iot-vehicle-tracking-system-firmware`.
2. Dò COM bằng script:
   - `python .claude/skills/esp32-loop-coding/scripts/com_detector.py --json`
3. Áp dụng quy tắc chọn COM:
   - 0 cổng: dừng, yêu cầu kết nối board
   - 1 cổng: dùng luôn
   - >1 cổng: hỏi `AskUserQuestion` đúng 1 lần đầu session, lưu COM đã chọn cho toàn session
4. Đặt file log đích theo COM:
   - `iot-vehicle-tracking-system-firmware/documents/test-logs/com{N}-monitor-latest.log`

## Loop workflow

1. Đọc serial bằng script `serial_reader.py` tới khi gặp một trong hai điều kiện:
   - Phát hiện lỗi nghiêm trọng
   - Đủ ổn định (đã boot và qua cửa sổ ổn định không có fatal mới)
2. Phân tích log bằng `log_analyzer.py` để lấy tín hiệu lỗi/fatal/boot.
3. Nếu có lỗi:
   - Xác định file nguồn liên quan
   - Sửa trực tiếp code (không mock)
   - Chạy compile/build qua PowerShell/CMD
   - Flash qua PowerShell/CMD với `idf.py -p <COM> build flash`
4. Nếu ổn định:
   - Kết thúc vòng lặp
5. Nếu chưa ổn định và chưa có fatal rõ:
   - Theo dõi thêm một vòng monitor

## Command templates

- Monitor serial + ghi log:
  - `python .claude/skills/esp32-loop-coding/scripts/serial_reader.py --port COM6 --baud 115200 --log-file iot-vehicle-tracking-system-firmware/documents/test-logs/com6-monitor-latest.log --max-seconds 120 --stable-seconds 20 --quiet-seconds 3 --json`
- Phân tích log mới nhất:
  - `python .claude/skills/esp32-loop-coding/scripts/log_analyzer.py --from-file iot-vehicle-tracking-system-firmware/documents/test-logs/com6-monitor-latest.log --tail-lines 800 --json`
- Chạy vòng lặp cơ bản:
  - `python .claude/skills/esp32-loop-coding/scripts/loop_runner.py --firmware-dir iot-vehicle-tracking-system-firmware --max-iterations 8 --json`

## ESP-IDF command policy (Windows)

- Không chạy trực tiếp `idf.py ...` trong Git Bash/MSYS.
- Chạy qua PowerShell:
  - `powershell -NoProfile -ExecutionPolicy Bypass -Command "& 'C:\Espressif\esp-idf-v5.5.3\export.ps1'; cd 'E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-firmware'; idf.py build"`
- Hoặc chạy qua CMD từ bash:
  - `cmd.exe /c "cd /d E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-firmware && call C:\Espressif\esp-idf-v5.5.3\export.bat && idf.py build"`
- Áp dụng tương tự cho các lệnh khác:
  - `idf.py -p <COM> flash`
  - `idf.py -p <COM> monitor`
  - `idf.py -p <COM> build flash`
  - `idf.py fullclean && idf.py build`

## Guardrails

- Chỉ hỏi chọn COM khi nhiều cổng và chưa có COM session.
- Chỉ flash sau khi đã sửa code trong vòng hiện tại.
- Luôn append vào file `com{N}-monitor-latest.log` để giữ lịch sử đọc cổng COM.
- Ưu tiên fix nhỏ, kiểm tra lại bằng monitor ngay sau flash.

## Resources

- Workflow chi tiết: `references/workflow.md`
- Quy tắc dừng monitor: `references/stop-conditions.md`
- Script chọn COM: `scripts/com_detector.py`
- Script đọc serial: `scripts/serial_reader.py`
- Script phân tích log: `scripts/log_analyzer.py`
- Script chạy vòng lặp: `scripts/loop_runner.py`
- Test scripts: `scripts/tests/`
