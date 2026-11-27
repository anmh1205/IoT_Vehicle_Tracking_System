#pragma once

/**
 * @file at_engine.h
 * @brief Bộ thực thi một lệnh AT tại một thời điểm: ghép dòng trả lời, nhận prompt, tính timeout.
 *
 * Module thuần C, không phụ thuộc ESP-IDF: ghi byte qua con trỏ hàm at_tx_t và nhận thời gian
 * qua tham số, nên kiểm thử trên host được. Không có khoá bên trong; mọi lời gọi phải xuất phát
 * từ cùng một task (task "modem").
 *
 * Quy trình dùng: at_engine_start() gửi lệnh; vòng lặp đưa từng dòng nhận được vào
 * at_engine_on_line() (và prompt vào at_engine_on_prompt()); at_engine_poll() báo kết quả
 * hoặc hết thời gian.
 */

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/base/time.h"

#define AT_RESP_MAX 192u   /**< Kích thước bộ đệm lưu dòng trả lời (gồm NUL). */

/** Mô tả một lệnh AT và cách nhận biết kết thúc của nó. */
typedef struct {
    const char    *text;            /**< Nội dung lệnh, không gồm "\r" (engine tự thêm). */
    const char    *capture;         /**< Tiền tố dòng cần giữ lại vào resp (ví dụ "+CPIN:"); NULL = không giữ. */
    const char    *final_prefix;    /**< NULL: dòng OK kết thúc lệnh. Khác NULL: lệnh kết thúc khi gặp dòng
                                         có tiền tố này (thường đến sau OK, ví dụ "+CMQTTPUB:"). */
    uint8_t        final_err_field; /**< 0: dòng final không mang mã lỗi. n > 0: trường thứ n (đếm từ 1)
                                         sau dấu ':' là mã lỗi, 0 nghĩa là thành công. Ví dụ
                                         "+CMQTTPUB: 0,<err>" dùng 2 và "+CMQTTSTART: <err>" dùng 1
                                         (AT manual MQTT của SIM7600). */
    const uint8_t *data;            /**< Dữ liệu gửi sau prompt '>' (chế độ nhập dữ liệu); NULL = không có. */
    size_t         data_len;        /**< Độ dài @c data. */
    uint32_t       timeout_ms;      /**< Thời gian tối đa chờ lệnh kết thúc. */
    bool           redact;          /**< Lệnh có credential hoặc URL riêng tư. */
    bool           final_exact;     /**< So cả dòng nếu final_prefix chứa giá trị kết thúc. */
} at_cmd_t;

/** Kết quả của một lệnh. */
typedef enum {
    AT_RES_PENDING = 0,   /**< Chưa kết thúc. */
    AT_RES_OK,            /**< Thành công. */
    AT_RES_ERROR,         /**< Module trả ERROR/+CME ERROR, hoặc dòng final mang mã lỗi khác 0. */
    AT_RES_TIMEOUT        /**< Hết timeout_ms mà chưa kết thúc. */
} at_result_t;

/** Đường ghi byte tới module. */
typedef struct {
    void (*write)(void *ctx, const void *buf, size_t n);   /**< Ghi @p n byte; không chờ phản hồi. */
    void *ctx;                                             /**< Truyền lại cho write(). */
} at_tx_t;

/** Trạng thái engine; các trường chỉ đọc đối với caller trừ resp. */
typedef struct {
    at_tx_t     tx;
    at_cmd_t    cmd;          /**< Bản sao lệnh đang chạy; con trỏ bên trong vẫn do caller sở hữu. */
    ivts_ms_t   deadline;     /**< Thời điểm (ms) hết hạn của lệnh đang chạy. */
    bool        busy;         /**< Có lệnh đang chạy. */
    bool        ok_seen;      /**< Đã nhận dòng OK (dùng khi chờ thêm dòng final_prefix). */
    bool        data_sent;    /**< Đã gửi data sau prompt, chỉ gửi một lần. */
    at_result_t result;       /**< Kết quả của lệnh gần nhất. */
    char        resp[AT_RESP_MAX];   /**< Dòng capture hoặc final_prefix nhận được sau cùng; hoặc dòng lỗi. */
} at_engine_t;

/** Đặt engine về trạng thái rảnh với đường ghi @p tx. */
void at_engine_init(at_engine_t *e, at_tx_t tx);

/**
 * @brief Gửi lệnh và bắt đầu theo dõi kết quả.
 * @param now Thời gian hiện tại (ms); hạn chót là now + cmd->timeout_ms.
 * @retval IVTS_OK                  Đã gửi.
 * @retval IVTS_ERR_INVALID_STATE   Đang có lệnh chạy.
 * @retval IVTS_ERR_INVALID_ARG     cmd hoặc cmd->text NULL.
 */
ivts_err_t at_engine_start(at_engine_t *e, const at_cmd_t *cmd, ivts_ms_t now);

/**
 * @brief Đưa một dòng nhận được vào engine.
 * @return true nếu dòng thuộc về lệnh đang chạy và đã được tiêu thụ; false nếu caller phải xử lý
 *         như URC hoặc dòng không xác định.
 */
bool at_engine_on_line(at_engine_t *e, const char *line);

/** Báo đã nhận prompt '>'; gửi data của lệnh nếu có và chưa gửi. */
void at_engine_on_prompt(at_engine_t *e);

/**
 * @brief Kiểm tra hạn chót và trả kết quả hiện tại.
 * @return AT_RES_PENDING nếu lệnh còn chạy; ngược lại là kết quả cuối.
 */
at_result_t at_engine_poll(at_engine_t *e, ivts_ms_t now);
