# Firmware IVTS cho ESP32-S3

Nạp môi trường ESP-IDF 6.1, rồi chạy từ thư mục này.

```sh
python -m pip install -r requirements-dev.txt
python -m pytest tests -q
IVTS_HOST_SANITIZE=1 python -m pytest tests -q
idf.py set-target esp32s3
idf.py build
idf.py size
```

Bộ kiểm thử host cần trình biên dịch C và chạy các fixture trên máy phát triển. Để kiểm tra payload với MQTT Bridge, build Bridge rồi đặt `IVTS_BRIDGE_VALIDATOR` trỏ đến `dist/validators/payload.validator.js`. Build ESP32-S3 kiểm tra khả năng biên dịch và kích thước phân vùng. Xác nhận hành vi RTC, IMU, modem, OBD, SD khi mất nguồn và OTA cần board thử nghiệm.

Giữ `sdkconfig` và `sdkconfig.old` cục bộ vì chúng có thể chứa thông tin xác thực. Các mặc định dùng chung nằm trong [sdkconfig.defaults](sdkconfig.defaults).

Đặt tên hàm theo `<component>_<module>_<động_từ>` và ghi đơn vị ở cuối tên biến (`_ms`, `_s`, `_mv`, `_mmps2`). Dùng `_at_ms` cho mốc thời gian và `_ms` cho khoảng thời gian. Dùng tên vị từ cho biến bool. Mỗi module sở hữu dữ liệu của mình. Dùng một header riêng cho mỗi module và viết đường dẫn include tính từ `src/`. Gom các source liên quan theo trách nhiệm và liệt kê tường minh trong CMake. Bảng [task](components/app/src/boot/task_table.h) quản lý priority và stack theo byte. [Platform](components/platform/include/platform/platform.h) cung cấp delay và mutex cho adapter. Kiểm thử [ranh giới include](tests/test_layers.py) giới hạn FreeRTOS và header SDK ở nơi sở hữu. Viết chú thích và Doxygen bằng tiếng Anh, ghi rõ ngữ cảnh task, thời gian chờ và vòng đời dữ liệu.

Các component có hướng dẫn riêng cho [app](components/app/README.md), [board](components/board/README.md), [modem](components/modem/README.md), [storage](components/storage/README.md), [OBD](components/obd/README.md), [OTA](components/ota/README.md), [ivts-core](components/ivts-core/README.md) và [platform](components/platform/README.md).

Xem [thiết kế và phần cứng](IVTS.md) để biết các hợp đồng lưu trữ, giao tiếp và nguồn điện.
