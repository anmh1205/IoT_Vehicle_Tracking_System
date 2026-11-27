/**
 * @file src/persist/rtc_context.c
 * @brief Validation and save of application context in retained RTC memory.
 *
 * Startup reuses a boot identity only after a valid deep-sleep wake. The app task saves the
 * sequence before sleep. The magic, version, size and CRC protect against invalid context.
 * Other resets request a new boot ID from NVS and use a random value if allocation fails.
 */
#include "persist/persist.h"
#include "app_internal.h"
#include <stddef.h>
#include <string.h>
#include "esp_attr.h"
#include "ivts_core/base/crc32.h"

#define CTX_MAGIC   0x52544358u   /**< Fixed RTCX signature represented as an integer. */
#define CTX_VERSION 1u            /**< Version of the retained record layout. */

/** @brief Retained RTC layout owned by startup and then the app task. */
typedef struct {
    uint32_t magic; /**< Fixed context signature. */
    uint16_t version; /**< Retained layout version. */
    uint16_t size; /**< Retained record size in bytes. */
    uint32_t boot_id; /**< Boot identity to reuse across a deep-sleep wake. */
    uint32_t seq; /**< Last allocated message sequence for the retained identity. */
    uint8_t  last_state; /**< FSM state saved before sleep. The load path does not use this field. */
    uint8_t  pad[3]; /**< Padding bytes written as zero and included in the checksum. */
    uint32_t crc; /**< CRC32 over the preceding bytes. */
} rtc_ctx_t;

/* Startup reads and may reset the retained copy. The app task writes it before sleep. */
static RTC_DATA_ATTR rtc_ctx_t s_ctx;

/** @brief Calculate CRC32 over the bytes preceding the checksum. */
static uint32_t ctx_crc(const rtc_ctx_t *c) { return ivts_crc32(0, c, offsetof(rtc_ctx_t, crc)); }

bool app_rtc_ctx_load(uint32_t *boot_id, uint32_t *seq)
{
    bool ok = s_ctx.magic == CTX_MAGIC && s_ctx.version == CTX_VERSION &&
              s_ctx.size == sizeof s_ctx && s_ctx.crc == ctx_crc(&s_ctx);
    if (!ok) {
        memset(&s_ctx, 0, sizeof s_ctx);
        return false;
    }
    *boot_id = s_ctx.boot_id;
    *seq = s_ctx.seq;
    app_msg_seq_restore(s_ctx.seq);
    return true;
}

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
    app_msg_seq_restore(seq);
}
