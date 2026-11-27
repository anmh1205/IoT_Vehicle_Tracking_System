#pragma once

/**
 * @file app.h
 * @brief Điểm vào của tầng ứng dụng (composition root).
 */

/**
 * @brief Khởi tạo toàn bộ firmware và tạo task "app".
 *
 * Thứ tự khởi tạo: queue sự kiện, board, storage, modem, obd, ota; sau đó tạo task "app".
 * Hàm trả về ngay sau khi task được tạo.
 *
 * Nếu khởi tạo một thành phần bắt buộc thất bại (queue, board, storage, modem), hàm ghi log,
 * chờ 10 giây rồi gọi esp_restart(). Các thành phần không bắt buộc (SD, IMU, RTC, OBD) thất bại
 * thì firmware chạy tiếp ở chế độ suy giảm.
 *
 * @note Gọi một lần từ app_main(), trước khi scheduler phục vụ task nào của firmware.
 */
void app_start(void);
