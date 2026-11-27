#pragma once

/**
 * @file at_parser.h
 * @brief Tách luồng byte UART của SIM7600 thành dòng văn bản, prompt '>' và khối dữ liệu thô,
 *        và phân loại dòng.
 *
 * Module thuần C: không truy cập UART, không dùng đồng hồ; at_dispatch.c đưa từng byte vào.
 * Không có khoá bên trong; mọi lời gọi phải xuất phát từ task "modem".
 */

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

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
