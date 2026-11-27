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

Đặt tên hàm theo `<component>_<module>_<động_từ>` và ghi đơn vị ở cuối tên biến (`_ms`, `_s`, `_mv`, `_mmps2`). Dùng `_at_ms` cho mốc thời gian và `_ms` cho khoảng thời gian. Dùng tên vị từ cho biến bool. Mỗi module sở hữu dữ liệu của mình, khai báo API nội bộ theo thư mục và liệt kê nguồn tường minh trong CMake. Tách phần tính toán thuần để kiểm thử trên host.

Các component có hướng dẫn riêng cho [app](components/app/README.md), [board](components/board/README.md)  [modem](components/modem/README.md), [storage](components/storage/README.md) và [platform](components/platform/README.md).

Xem [thiết kế và phần cứng](IVTS.md) để biết các hợp đồng lưu trữ, giao tiếp và nguồn điện.
