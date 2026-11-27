/**
 * @file app_rtc_ctx.c
 * @brief Ngữ cảnh giữ qua deep sleep: boot_id và bộ đếm seq của bản ghi.
 *
 * Ngữ cảnh nằm trong RTC slow memory (RTC_DATA_ATTR): còn nguyên qua deep sleep, mất khi mất
 * nguồn hoặc reset do nguồn. Nội dung sau mất nguồn là rác nên magic, version, size và CRC
 * quyết định có dùng hay không; sai một trong bốn thì coi như không có ngữ cảnh.
 *
 * ## Ngữ cảnh gọi
 *
 * Mọi hàm chỉ gọi từ task "app" (hoặc từ app_init_all() trước khi task đó tồn tại), nên
 * s_seq không cần khoá. s_seq tăng trong RAM theo từng bản ghi; giá trị chỉ được ghi xuống
 * RTC trong app_rtc_ctx_save(), gọi trước khi ngủ.
 *
 * ## Khi reset hoặc mất nguồn
 *
 * Reset đột ngột (không qua đường ngủ) giữ lại ngữ cảnh của lần ngủ trước, với seq cũ hơn seq
 * đã dùng. Để seq không lặp lại, boot_id phải đổi: chỉ deep sleep hợp lệ mới tái sử dụng
 * ngữ cảnh, còn app_init_all() cấp boot_id mới từ NVS mỗi khi ngữ cảnh không hợp lệ.
 */

#include "app_priv.h"
#include <stddef.h>
#include <string.h>
#include "esp_attr.h"
#include "ivts_core/base/crc32.h"

#define CTX_MAGIC   0x52544358u   /* ASCII "RTCX". */
#define CTX_VERSION 1u            /* Tăng khi đổi layout rtc_ctx_t. */

/** Layout ngữ cảnh trong RTC memory; crc phủ mọi byte đứng trước nó. */
typedef struct {
    uint32_t magic;
    uint16_t version;
    uint16_t size;
    uint32_t boot_id;
    uint32_t seq;
    uint8_t  last_state;
    uint8_t  pad[3];
    uint32_t crc;
} rtc_ctx_t;

static RTC_DATA_ATTR rtc_ctx_t s_ctx;   /* Bản trong RTC memory, chỉ ghi ở app_rtc_ctx_save(). */
static uint32_t s_seq;                  /* Bộ đếm seq đang chạy trong RAM. */

/** CRC32 của ngữ cảnh, tính trên các byte đứng trước trường crc. */
static uint32_t ctx_crc(const rtc_ctx_t *c) { return ivts_crc32(0, c, offsetof(rtc_ctx_t, crc)); }

/**
 * @brief Nạp ngữ cảnh từ RTC memory nếu hợp lệ.
 * @param[out] boot_id boot_id của lần chạy trước.
 * @param[out] seq     seq cuối cùng đã lưu; bộ đếm tiếp tục từ giá trị này.
 * @return true nếu ngữ cảnh hợp lệ; false (và ngữ cảnh bị xoá) nếu không.
 */
bool app_rtc_ctx_load(uint32_t *boot_id, uint32_t *seq)
{
    bool ok = s_ctx.magic == CTX_MAGIC && s_ctx.version == CTX_VERSION &&
              s_ctx.size == sizeof s_ctx && s_ctx.crc == ctx_crc(&s_ctx);
    if (!ok) {
        memset(&s_ctx, 0, sizeof s_ctx);       /* Ngữ cảnh không hợp lệ: xoá về mặc định. */
        return false;
    }
    *boot_id = s_ctx.boot_id;
    *seq = s_ctx.seq;
    s_seq = s_ctx.seq;
    return true;
}

/**
 * @brief Ghi ngữ cảnh xuống RTC memory kèm CRC và đặt bộ đếm seq về @p seq.
 * @param last_state Trạng thái FSM trước khi ngủ (ivts_app_state_t).
 */
void app_rtc_ctx_save(uint32_t boot_id, uint32_t seq, uint8_t last_state)
{
    memset(&s_ctx, 0, sizeof s_ctx);
    s_ctx.magic = CTX_MAGIC;
    s_ctx.version = CTX_VERSION;
    s_ctx.size = sizeof s_ctx;
    s_ctx.boot_id = boot_id;
    s_ctx.seq = seq;
    s_ctx.last_state = last_state;
    s_ctx.crc = ctx_crc(&s_ctx);
    s_seq = seq;
}

/** Tăng bộ đếm seq và trả về giá trị mới. */
uint32_t app_rtc_next_seq(void)
{
    return ++s_seq;
}

/** Trả về seq đã cấp gần nhất mà không tăng bộ đếm. */
uint32_t app_rtc_current_seq(void)
{
    return s_seq;
}
