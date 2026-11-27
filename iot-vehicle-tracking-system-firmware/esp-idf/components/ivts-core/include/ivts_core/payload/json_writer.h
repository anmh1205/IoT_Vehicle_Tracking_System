#pragma once

/**
 * @file json_writer.h
 * @brief Bộ ghi JSON vào buffer của caller.
 *
 * Không cấp phát động và không dùng printf (newlib nano có thể thiếu %lld). Lỗi có tính
 * "dính": khi hết chỗ một lần, mọi lệnh sau là no-op và ivts_jw_finish() trả IVTS_ERR_FULL.
 */

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

#define IVTS_JW_MAX_DEPTH 8u   /**< Độ sâu lồng tối đa của object/array. */

/** State của writer; khởi tạo bằng ivts_jw_init(). */
typedef struct {
    char    *buf;
    size_t   cap;
    size_t   len;
    uint8_t  depth;
    bool     full;
    bool     bad;          /**< Dùng API sai: end thừa, lồng quá sâu, decimals > 9. */
    uint8_t  need_comma;   /**< Bit d = đã có phần tử ở độ sâu d (cần dấu phẩy trước phần tử kế). */
} ivts_jw_t;

/** @brief Khởi tạo writer. Buffer NULL hoặc cap = 0 đặt writer ở trạng thái đầy. */
void ivts_jw_init(ivts_jw_t *w, char *buf, size_t cap);
/* Với key: truyền NULL ở top-level hoặc khi phần tử nằm trong mảng. */
void ivts_jw_obj_begin(ivts_jw_t *w, const char *key);
void ivts_jw_obj_end(ivts_jw_t *w);
void ivts_jw_arr_begin(ivts_jw_t *w, const char *key);
void ivts_jw_arr_end(ivts_jw_t *w);
void ivts_jw_str(ivts_jw_t *w, const char *key, const char *val);  /* val NULL ghi null. */
void ivts_jw_int(ivts_jw_t *w, const char *key, int64_t v);
void ivts_jw_uint(ivts_jw_t *w, const char *key, uint64_t v);
void ivts_jw_bool(ivts_jw_t *w, const char *key, bool v);
void ivts_jw_null(ivts_jw_t *w, const char *key);
/**
 * @brief Ghi số thập phân cố định: v / 10^decimals, ví dụ (-210285123, 7) -> -21.0285123.
 * @param decimals  Số chữ số thập phân, tối đa 9.
 */
void ivts_jw_fixed(ivts_jw_t *w, const char *key, int64_t v, uint8_t decimals);

/**
 * @brief Kết thúc và kiểm tra kết quả.
 * @param len  Nhận độ dài chuỗi (không gồm NUL); có thể NULL.
 * @return IVTS_OK; IVTS_ERR_FULL nếu hết chỗ; IVTS_ERR_INVALID_STATE nếu chưa đóng hết
 *         object/array hoặc đã dùng API sai.
 */
ivts_err_t ivts_jw_finish(ivts_jw_t *w, size_t *len);
