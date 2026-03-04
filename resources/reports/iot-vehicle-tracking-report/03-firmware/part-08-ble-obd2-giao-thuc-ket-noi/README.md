# Part 08 - Giao thức kết nối BLE OBD2 (Vgate iCar Pro)

> Tài liệu chi tiết về giao thức Bluetooth Low Energy (BLE 4.0) để kết nối ESP32-S3 với adapter OBD2 Vgate iCar Pro, phục vụ đọc dữ liệu chẩn đoán động cơ trong hệ thống IoT giám sát phương tiện.

## Mục lục

- [01 - Tổng quan BLE và OBD2](./01-tong-quan-ble-obd2.md): Giới thiệu công nghệ BLE 4.0, vai trò của OBD2 adapter, lý do chọn Vgate iCar Pro
- [02 - Đặc tả Vgate iCar Pro BLE 4.0](./02-dac-ta-vgate-icar-pro.md): Thông số kỹ thuật, GATT Profile, UUID Service/Characteristic
- [03 - Quy trình kết nối BLE](./03-quy-trinh-ket-noi-ble.md): 6 bước kết nối từ khởi tạo stack đến truyền nhận dữ liệu
- [04 - Giao thức OBD2 qua BLE](./04-giao-thuc-obd2-qua-ble.md): Format lệnh/phản hồi, bảng PID, công thức chuyển đổi, AT commands
- [05 - Xử lý lỗi và tối ưu](./05-xu-ly-loi-va-toi-uu.md): Buffer multi-packet, auto-reconnect, NVS cache, troubleshooting

## Mối quan hệ với các phần khác

| Phần liên quan | Mô tả |
|---------------|-------|
| `part-02-ble-obd2.md` | Chiến lược kết nối BLE OBD2 tổng quan (high-level) |
| `part-07-vgate-icar-pro-esp-idf-reference/` | Code reference tiếng Anh từ project esp32-obd2-meter |
| `part-01-kien-truc-va-luong-hoat-dong.md` | Kiến trúc firmware tổng thể và luồng hoạt động |
| `part-05-data-format-state-machine.md` | Định dạng dữ liệu và state machine firmware |

> **Ghi chú:** Part 08 tập trung giải thích **giao thức và nguyên lý** bằng tiếng Việt, phù hợp để đưa vào báo cáo đồ án. Part 07 là tài liệu tham khảo code chi tiết bằng tiếng Anh.

## Workflow đọc

1. Đọc `01-tong-quan` để hiểu tại sao chọn BLE và Vgate iCar Pro
2. Đọc `02-dac-ta` để nắm GATT Profile và UUID
3. Đọc `03-quy-trinh` để hiểu từng bước kết nối
4. Đọc `04-giao-thuc` để hiểu cách gửi/nhận lệnh OBD2
5. Đọc `05-xu-ly-loi` để biết cách xử lý các tình huống thực tế
