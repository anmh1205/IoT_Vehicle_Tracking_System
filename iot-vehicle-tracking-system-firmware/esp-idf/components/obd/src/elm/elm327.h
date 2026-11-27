#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/model/telemetry.h"

/**
 * @file elm327.h
 * @brief Giao thức văn bản của adapter ELM327: ghép phản hồi, kiểm tra hợp lệ, tách byte dữ liệu.
 *
 * Module thuần C, không có trạng thái toàn cục; kiểm thử được trên host. Một phản hồi kết thúc
 * bằng prompt '>'.
 */

#define ELM_REPLY_MAX 512u   /**< Dung lượng bộ đệm một phản hồi (gồm NUL). */

/** Một bước của chuỗi khởi tạo adapter. */
typedef struct {
    const char *cmd;          /**< Lệnh AT gửi (không gồm "\r"). */
    uint32_t    timeout_ms;   /**< Thời gian chờ phản hồi; ATZ dài nhất vì adapter khởi động lại. */
    bool        is_reset;     /**< Lệnh reset: phản hồi có chuỗi banner thay vì chỉ "OK". */
} elm_init_step_t;

extern const elm_init_step_t ELM_INIT_SEQ[];   /**< Chuỗi khởi tạo theo thứ tự thực hiện. */
extern const size_t ELM_INIT_SEQ_LEN;          /**< Số bước của ELM_INIT_SEQ. */

/** Bộ ghép phản hồi từ các mảnh notification BLE. */
typedef struct {
    char   buf[ELM_REPLY_MAX];   /**< Nội dung đã nhận, kết thúc bằng NUL. */
    size_t len;                  /**< Số byte trong buf. */
    bool   complete;             /**< Đã thấy prompt '>': phản hồi trọn vẹn. */
    bool   overflow;             /**< Phản hồi dài hơn bộ đệm; phần thừa bị bỏ. */
} elm_rx_t;

/** Xoá bộ ghép để nhận phản hồi mới. */
void elm_rx_reset(elm_rx_t *r);

/**
 * @brief Nối một mảnh notification vào bộ ghép.
 * @return true khi phản hồi đã trọn vẹn (đã thấy '>').
 */
bool elm_rx_feed(elm_rx_t *r, const uint8_t *data, size_t n);

/**
 * @brief Kiểm tra phản hồi hợp lệ: có prompt và không chứa lỗi đã biết.
 * @param is_reset         Phản hồi của lệnh reset (ATZ); không yêu cầu "OK".
 * @param is_at_command    Phản hồi của lệnh AT (không phải PID); yêu cầu có dòng "OK".
 */
bool elm_reply_valid(const char *reply, bool is_reset, bool is_at_command);

/** Phân loại trạng thái ECU từ phản hồi: có dữ liệu, đã dừng, không có dữ liệu hoặc không rõ. */
ivts_ecu_state_t elm_reply_ecu_state(const char *reply);

/**
 * @brief Lấy các byte dữ liệu của phản hồi cho service @p mode (ví dụ 0x01).
 *
 * Bỏ echo, "SEARCHING...", dòng đếm byte ISO-TP (ví dụ "00A"), tiền tố khung ("0:") và khoảng
 * trắng. Các byte ghi ra bắt đầu từ byte mode + 0x40. Khi nhiều ECU cùng trả lời, chỉ dùng dòng
 * khớp đầu tiên.
 *
 * @param[out] out Bộ đệm nhận byte; @p cap là dung lượng.
 * @param[out] n   Số byte ghi vào out.
 * @retval IVTS_OK         Đã tách được dữ liệu.
 * @retval IVTS_ERR_NOT_FOUND Không có dòng nào khớp.
 */
ivts_err_t elm_extract_bytes(const char *reply, uint8_t mode, uint8_t *out, size_t cap, size_t *n);
