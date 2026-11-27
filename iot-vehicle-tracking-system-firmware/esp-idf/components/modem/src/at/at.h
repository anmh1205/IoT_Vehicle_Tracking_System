/**
 * @file at.h
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

#pragma once
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

/**
 * @file at_parser.h
 * @brief Tách luồng byte UART của SIM7600 thành dòng văn bản, prompt '>' và khối dữ liệu thô,
 *        và phân loại dòng.
 *
 * Module thuần C: không truy cập UART, không dùng đồng hồ; at_dispatch.c đưa từng byte vào.
 * Không có khoá bên trong; mọi lời gọi phải xuất phát từ task "modem".
 */

#define AT_LINE_MAX 256u   /**< Kích thước bộ đệm một dòng hoặc một khối dữ liệu thô (gồm NUL). */

/** Đơn vị dữ liệu parser trả về sau mỗi byte. */
typedef enum {
    AT_UNIT_NONE = 0,   /**< Chưa đủ một đơn vị. */
    AT_UNIT_LINE,       /**< p->buf là một dòng đã bỏ CR/LF và kết thúc bằng NUL. */
    AT_UNIT_PROMPT,     /**< Module chờ dữ liệu ('>' ở đầu dòng). */
    AT_UNIT_DATA        /**< p->buf chứa p->len byte thô (một phần hoặc hết khối). */
} at_unit_t;

/** Trạng thái parser. buf và len là kết quả; các trường còn lại là trạng thái nội bộ. */
typedef struct {
    char   buf[AT_LINE_MAX];
    size_t len;
    size_t raw_left;      /**< Số byte thô còn phải nhận; > 0 nghĩa là đang ở chế độ thô. */
    bool   overflow;      /**< Dòng dài hơn AT_LINE_MAX: phần thừa bị bỏ. */
    bool   skip_lf;       /**< Dòng trước kết thúc bằng CR; LF kế tiếp thuộc về dòng đó. */
    bool   skip_prompt_space;
    bool   unit_done;     /**< Đơn vị trước đã giao cho caller; lần feed kế tiếp xoá bộ đệm. */
} at_parser_t;

/** Đặt parser về trạng thái ban đầu. */
void at_parser_init(at_parser_t *p);

/**
 * @brief Đưa một byte vào parser.
 * @return Đơn vị hoàn chỉnh nếu có, ngược lại AT_UNIT_NONE. Nội dung trong p->buf và p->len chỉ
 *         hợp lệ đến lần gọi at_parser_feed() kế tiếp.
 */
at_unit_t at_parser_feed(at_parser_t *p, uint8_t b);

/**
 * @brief Chuyển sang chế độ thô cho @p n byte kế tiếp.
 *
 * Gọi ngay sau khi xử lý dòng header báo trước n byte dữ liệu, ví dụ "+CMQTTRXPAYLOAD: 0,17".
 * Dữ liệu được trả về qua AT_UNIT_DATA, mỗi lần tối đa AT_LINE_MAX byte.
 */
void at_parser_expect_raw(at_parser_t *p, size_t n);

/** Loại dòng văn bản. */
typedef enum {
    AT_LINE_INFO = 0,     /**< Dòng phản hồi trung gian. */
    AT_LINE_OK,           /**< "OK". */
    AT_LINE_ERROR,        /**< "ERROR", "+CME ERROR:" hoặc "+CMS ERROR:". */
    AT_LINE_URC           /**< Dòng module tự gửi, nằm trong bảng tiền tố URC. */
} at_line_kind_t;

/** Phân loại một dòng. */
at_line_kind_t at_classify(const char *line);

/** @return true nếu @p line bắt đầu bằng @p prefix (phân biệt hoa thường). */
bool at_has_prefix(const char *line, const char *prefix);

/**
 * @brief Lấy số nguyên thứ @p idx (đếm từ 0) sau dấu ':' của dòng dạng "+X: a,b,c".
 * @return false nếu thiếu trường, trường không phải số nguyên hợp lệ hoặc vượt int32_t.
 */
bool at_field_int(const char *line, unsigned idx, int32_t *out);

/* Initialize the engine and its parser before the modem task starts. */
void modem_at_dispatch_init(void);
/* Modem task. Pump UART or run one synchronous AT command while servicing URCs. */
void modem_at_dispatch_pump(uint32_t wait_ms);
void modem_expect_raw(size_t len);
at_result_t modem_at(const at_cmd_t *command);
at_result_t modem_at_simple(const char *command, uint32_t timeout_ms);
const char *modem_at_response(void);
