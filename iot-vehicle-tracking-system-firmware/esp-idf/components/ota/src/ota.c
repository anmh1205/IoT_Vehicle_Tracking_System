#include "ota_internal.h"
#include "esp_app_desc.h"
#include "esp_log.h"
#include "esp_ota_ops.h"
#include "platform/platform.h"

#include <stdatomic.h>

static ota_cfg_t s_ota_cfg;
static _Atomic uint32_t s_progress;

const ota_cfg_t *ota_config(void) { return &s_ota_cfg; }

ivts_err_t ota_init(const ota_cfg_t *cfg)
{
    if (cfg == NULL || cfg->src.open == NULL || cfg->src.read == NULL || cfg->src.close == NULL ||
        cfg->prepare_boot == NULL) {
        return IVTS_ERR_INVALID_ARG;
    }
    s_ota_cfg = *cfg;
    return IVTS_OK;
}

void ota_emit(uint8_t phase, uint8_t pct, uint8_t err)
{
    uint32_t progress = (1u << 24) | ((uint32_t)phase << 16) | ((uint32_t)pct << 8) | err;
    atomic_store(&s_progress, progress);
    ivts_event_t ev = { .type = IVTS_EV_OTA_PROGRESS, .ts_ms = platform_uptime_ms() };
    ev.u.ota_progress.phase = phase;
    ev.u.ota_progress.pct = pct;
    ev.u.ota_progress.err = err;
    (void)ivts_sink_emit(&s_ota_cfg.sink, &ev);
}

bool ota_progress_take(ivts_event_t *ev)
{
    uint32_t progress = atomic_exchange(&s_progress, 0u);
    if (progress == 0u) { return false; }
    *ev = (ivts_event_t){ .type = IVTS_EV_OTA_PROGRESS };
    ev->u.ota_progress.phase = (uint8_t)(progress >> 16);
    ev->u.ota_progress.pct = (uint8_t)(progress >> 8);
    ev->u.ota_progress.err = (uint8_t)progress;
    return true;
}

/* Xem ota.h. */
bool ota_image_pending_verify(void)
{
    esp_ota_img_states_t st;
    const esp_partition_t *run = esp_ota_get_running_partition();
    return run != NULL && esp_ota_get_state_partition(run, &st) == ESP_OK && st == ESP_OTA_IMG_PENDING_VERIFY;
}

/* Xem ota.h. */
ivts_err_t ota_mark_valid(void)
{
    return esp_ota_mark_app_valid_cancel_rollback() == ESP_OK ? IVTS_OK : IVTS_ERR_IO;
}

/* Xem ota.h. */
ivts_err_t ota_rollback_and_reboot(void)
{
    /* ESP-IDF khởi động lại nếu thành công, nên quay lại caller luôn là lỗi. */
    esp_err_t e = esp_ota_mark_app_invalid_rollback_and_reboot();
    ESP_LOGE(OTA_TAG, "rollback: %s", esp_err_to_name(e));
    return IVTS_ERR_IO;
}

bool ota_can_rollback(void)
{
    const esp_partition_t *running = esp_ota_get_running_partition();
    return running != NULL && running->subtype != ESP_PARTITION_SUBTYPE_APP_FACTORY &&
           esp_ota_check_rollback_is_possible();
}

ivts_err_t ota_schedule_rollback(void)
{
    if (!ota_can_rollback()) { return IVTS_ERR_INVALID_STATE; }
    return esp_ota_mark_app_invalid_rollback() == ESP_OK ? IVTS_OK : IVTS_ERR_INVALID_STATE;
}

/* Xem ota.h. */
const char *ota_running_version(void)
{
    return esp_app_get_description()->version;
}

/* Xem ota.h. */
const char *ota_running_partition(void)
{
    const esp_partition_t *p = esp_ota_get_running_partition();
    return p != NULL ? p->label : "";
}
