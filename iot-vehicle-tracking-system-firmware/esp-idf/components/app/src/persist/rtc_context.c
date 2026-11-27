/**
 * @file rtc_context.c
 * @brief Validation and save of application context in RTC memory.
 *
 * RTC slow memory retains this context through deep sleep. Validate the magic,
 * version, size and CRC before using it.
 *
 * Only the app task and its startup caller access this context. The sequence
 * advances in RAM and is written to RTC memory when the app prepares for
 * sleep.
 *
 * An abrupt reset can leave the older deep-sleep sequence in RTC memory. Boot
 * reuses the retained identity only after a valid deep-sleep wake. Other
 * resets allocate a new boot ID to avoid identifying a new record as a replay.
 */
#include "persist/persist.h"
#include "app_internal.h"
#include <stddef.h>
#include <string.h>
#include "esp_attr.h"
#include "ivts_core/base/crc32.h"

#define CTX_MAGIC   0x52544358u   /* ASCII "RTCX". */
#define CTX_VERSION 1u            /* Increment when changing the rtc_ctx_t layout. */

/** Retained RTC layout. The CRC covers every byte before the checksum field. */
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

static RTC_DATA_ATTR rtc_ctx_t s_ctx;   /* Retained copy, written by app_rtc_ctx_save(). */

/** Calculate CRC32 over the bytes preceding the crc field. */
static uint32_t ctx_crc(const rtc_ctx_t *c) { return ivts_crc32(0, c, offsetof(rtc_ctx_t, crc)); }

/**
 * @brief Load and validate the retained RTC context.
 * @param[out] boot_id Boot ID retained from the previous run.
 * @param[out] seq Last saved sequence. Allocation resumes from this value.
 * @return true when the context is valid. Invalid retained context is cleared.
 */
bool app_rtc_ctx_load(uint32_t *boot_id, uint32_t *seq)
{
    bool ok = s_ctx.magic == CTX_MAGIC && s_ctx.version == CTX_VERSION &&
              s_ctx.size == sizeof s_ctx && s_ctx.crc == ctx_crc(&s_ctx);
    if (!ok) {
        memset(&s_ctx, 0, sizeof s_ctx);       /* Clear the invalid context to its default state. */
        return false;
    }
    *boot_id = s_ctx.boot_id;
    *seq = s_ctx.seq;
    app_msg_seq_restore(s_ctx.seq);
    return true;
}

/**
 * @brief Write the context and CRC to RTC memory and restore the sequence to @p seq.
 * @param last_state FSM state before entering sleep (ivts_fsm_state_t).
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
    app_msg_seq_restore(seq);
}
