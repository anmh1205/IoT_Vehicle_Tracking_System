#pragma once

/**
 * @file json_reader.h
 * @brief Bộ đọc JSON có giới hạn cho dữ liệu từ cloud.
 *
 * Tokenizer kiểu jsmn: không cấp phát động, không sửa input, không đệ quy.
 * Dữ liệu cloud là dữ liệu ngoài nên độ sâu, số token và độ dài đều bị chặn.
 */

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

/** Loại token. */
typedef enum { IVTS_JT_OBJ = 1, IVTS_JT_ARR, IVTS_JT_STR, IVTS_JT_PRIM } ivts_jtype_t;

/** Một token JSON, mô tả bằng vị trí trong chuỗi nguồn. */
typedef struct {
    uint8_t  type;     /**< ivts_jtype_t. */
    uint16_t start;    /**< STR: sau dấu " mở. PRIM/OBJ/ARR: ký tự đầu tiên. */
    uint16_t end;      /**< Vị trí ngay sau ký tự cuối (STR: tại dấu " đóng). */
    uint16_t size;     /**< OBJ: số cặp key/value. ARR: số phần tử. */
    int16_t  parent;   /**< Chỉ số token cha; -1 cho gốc. */
} ivts_jtok_t;

#define IVTS_JSON_MAX_LEN 4096u   /**< Độ dài tối đa của chuỗi JSON. */

/**
 * @brief Tách JSON thành token.
 *
 * @param js         Chuỗi JSON (không cần NUL).
 * @param len        Độ dài, tối đa IVTS_JSON_MAX_LEN.
 * @param t          Mảng token đầu ra.
 * @param ntok       Số phần tử của @p t.
 * @param max_depth  Độ sâu lồng tối đa.
 * @return Số token (> 0), hoặc lỗi dưới dạng SỐ ÂM của ivts_err_t:
 *         -IVTS_ERR_FULL nếu hết token;
 *         -IVTS_ERR_INVALID_ARG nếu sai cú pháp, quá sâu, quá dài hoặc có dữ liệu thừa sau gốc.
 */
int ivts_json_parse(const char *js, size_t len, ivts_jtok_t *t, size_t ntok, uint8_t max_depth);

/**
 * @brief Tìm value của @p key trong object @c t[obj].
 * @return Chỉ số token của value, hoặc -1 nếu không có.
 */
int ivts_json_find(const char *js, const ivts_jtok_t *t, int ntok, int obj, const char *key);

/**
 * @brief Sao chép chuỗi đã giải escape vào @p out (có NUL).
 * @return IVTS_OK; IVTS_ERR_FULL nếu @p cap không đủ (out vẫn là chuỗi hợp lệ);
 *         IVTS_ERR_INVALID_ARG nếu token không phải chuỗi hoặc chứa escape không hỗ trợ
 *         (\u ngoài 0x01..0x7F bị từ chối).
 */
ivts_err_t ivts_json_get_str(const char *js, const ivts_jtok_t *tok, char *out, size_t cap);
/** @brief Đọc số nguyên không dấu 32 bit. Từ chối số âm, số thập phân và giá trị tràn. */
ivts_err_t ivts_json_get_u32(const char *js, const ivts_jtok_t *tok, uint32_t *out);
/** @brief Đọc giá trị true/false. */
ivts_err_t ivts_json_get_bool(const char *js, const ivts_jtok_t *tok, bool *out);
