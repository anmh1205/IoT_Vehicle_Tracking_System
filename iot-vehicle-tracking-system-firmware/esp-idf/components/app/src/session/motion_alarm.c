/**
 * @file src/session/motion_alarm.c
 * @brief Durable motion alarm delivery and acknowledgement.
 *
 * Startup restores the pending alarm. The app task latches a new identity and retries its NVS
 * write on delivery ticks. If a saved alarm cannot be cleared after a successful publish ACK,
 * keep it for retry. The publisher owns encoding and delivery.
 */
#include "persist/persist.h"
#include "session/motion_alarm.h"
#include "app_internal.h"
#include "storage/storage.h"

/* Startup restores the alarm. The app task owns the alarm, durability flag and retry deadline. */
static ivts_motion_alarm_t s_alarm;
static bool s_alarm_saved_to_nvs;
static uint64_t s_alarm_retry_at_ms;

void app_alarm_restore(void)
{
    s_alarm_saved_to_nvs = app_records_alarm_load(&s_alarm) == IVTS_OK && s_alarm.seq != 0u;
}

void app_alarm_latch(bool provisioned, uint32_t boot_id)
{
    if (!provisioned || s_alarm.seq != 0u) { return; }

    uint32_t seq = app_msg_seq_next();
    uint32_t uptime_ms = (uint32_t)app_now();
    uint64_t unix_ms = app_clock_unix_ms_or_zero(NULL);
    s_alarm = (ivts_motion_alarm_t){ .boot_id = boot_id, .seq = seq, .unix_ms = unix_ms, .uptime_ms = uptime_ms };
    s_alarm_saved_to_nvs = app_records_alarm_save(&s_alarm) == IVTS_OK;
    s_alarm_retry_at_ms = 0;
}

bool app_alarm_tick(void)
{
    if (s_alarm.seq == 0u || app_now() < s_alarm_retry_at_ms) { return false; }

    s_alarm_retry_at_ms = app_now() + ALARM_RETRY_MS;
    if (!s_alarm_saved_to_nvs) {
        s_alarm_saved_to_nvs = app_records_alarm_save(&s_alarm) == IVTS_OK;
    }
    return true;
}

bool app_alarm_has_unsent(void) { return s_alarm.seq != 0u; }
const ivts_motion_alarm_t *app_alarm_view(void) { return &s_alarm; }

void app_alarm_on_ack(bool ok)
{
    if (!ok) { return; }
    /* Clear the durable copy first so a failed NVS write retains the same identity for retry. */
    ivts_motion_alarm_t empty = {0};
    if (!s_alarm_saved_to_nvs || app_records_alarm_save(&empty) == IVTS_OK) {
        s_alarm = empty;
        s_alarm_saved_to_nvs = false;
    }
}
