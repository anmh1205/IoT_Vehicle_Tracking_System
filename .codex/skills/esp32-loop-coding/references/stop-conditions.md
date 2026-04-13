# Stop Conditions for Serial Monitor

## Goal

Dừng monitor sớm khi đã đủ tín hiệu để quyết định fix hoặc pass.

## Fatal stop

Dừng ngay khi gặp pattern mức nghiêm trọng:
- `Guru Meditation Error`
- `panic`
- `abort()`
- `assert failed`
- `Backtrace:`

## Error stop

Mặc định dừng khi gặp log error ESP-IDF dạng:
- `E (xxxx) TAG: ...`

Điều này giúp vào vòng fix sớm thay vì chờ hết timeout.

## Stable stop

Xem là "đủ ổn định" khi:
- Có tín hiệu boot/app (`Loaded app`, `app_main`, `Calling app_main`) và
- Không phát hiện error/fatal mới trong `stable_seconds`.

## Timeout stop

Nếu không chạm điều kiện trên trước `max_seconds`, dừng với trạng thái timeout.

## Practical defaults

- `max_seconds=120`
- `stable_seconds=20`
- `quiet_seconds=3` (tuỳ chọn quan sát, không bắt buộc)

## Interpretation

- `fatal` -> sửa lỗi ngay, build/flash, monitor lại.
- `unstable` -> sửa theo tag/module lỗi, build/flash, monitor lại.
- `stable` -> kết thúc session debug hoặc chuyển ca kiểm thử khác.
