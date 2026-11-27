/**
 * @file obd.c
 * @brief Hàm công khai của component obd; chuyển yêu cầu sang task "obd" qua queue.
 */

#include "obd_priv.h"

obd_cfg_t g_obd_cfg;

/* Xem obd.h. NimBLE được khởi tạo trong task OBD khi gọi obd_start(). */
ivts_err_t obd_init(const obd_cfg_t *cfg)
{
    if (cfg == NULL || cfg->sink.fn == NULL) { return IVTS_ERR_INVALID_ARG; }
    g_obd_cfg = *cfg;
    return (obd_os_start() == 0) ? IVTS_OK : IVTS_ERR_FULL;
}

/* Xem obd.h. */
ivts_err_t obd_start(void)
{
    return obd_os_set_enabled(true);
}

/* Xem obd.h. */
ivts_err_t obd_stop(void)
{
    return obd_os_set_enabled(false);
}

/* Xem obd.h. Khoá g_obd_diag_mx trong lúc sao chép nên không bao giờ đọc được dữ liệu ghi dở. */
ivts_err_t obd_diag_copy(ivts_obd_readiness_t *rd, ivts_dtc_list_t *stored,
                         ivts_dtc_list_t *pending, ivts_dtc_list_t *permanent)
{
    if (g_obd_diag_mx == NULL) { return IVTS_ERR_INVALID_STATE; }
    xSemaphoreTake(g_obd_diag_mx, portMAX_DELAY);
    if (rd != NULL)        { *rd = g_obd_rd; }
    if (stored != NULL)    { *stored = g_obd_dtc[0]; }
    if (pending != NULL)   { *pending = g_obd_dtc[1]; }
    if (permanent != NULL) { *permanent = g_obd_dtc[2]; }
    xSemaphoreGive(g_obd_diag_mx);
    return IVTS_OK;
}
