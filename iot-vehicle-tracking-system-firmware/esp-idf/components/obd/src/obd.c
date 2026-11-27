/**
 * @file obd.c
 * @brief Hàm công khai của component obd; chuyển yêu cầu sang task "obd" qua queue.
 */

#include "obd_internal.h"

static obd_cfg_t s_obd_cfg;

const obd_cfg_t *obd_config(void) { return &s_obd_cfg; }

void obd_emit(const ivts_event_t *event)
{
    (void)ivts_sink_emit(&s_obd_cfg.sink, event);
}

/* Xem obd.h. NimBLE được khởi tạo trong task OBD khi gọi obd_start(). */
ivts_err_t obd_init(const obd_cfg_t *cfg)
{
    if (cfg == NULL || cfg->sink.fn == NULL) { return IVTS_ERR_INVALID_ARG; }
    s_obd_cfg = *cfg;
    return (obd_task_start() == 0) ? IVTS_OK : IVTS_ERR_FULL;
}

/* Xem obd.h. */
ivts_err_t obd_start(void)
{
    return obd_task_set_enabled(true);
}

/* Xem obd.h. */
ivts_err_t obd_stop(void)
{
    return obd_task_set_enabled(false);
}
