#include "obd_internal.h"
#include "esp_log.h"
#include "host/ble_hs.h"
#include "nimble/nimble_port.h"
#include "nimble/nimble_port_freertos.h"

static uint8_t s_own_addr_type; /* Written before the host posts its synced event. */

uint8_t obd_ble_own_addr_type(void) { return s_own_addr_type; }

static void on_reset(int reason)
{
    ESP_LOGW(OBD_TAG, "nimble reset %d", reason);
}

static void on_sync(void)
{
    if (ble_hs_id_infer_auto(0, &s_own_addr_type) != 0) { return; }
    obd_ble_event_t e = { .type = OBD_BLE_EV_SYNCED };
    (void)obd_task_post(&e);
}

static void host_task(void *param)
{
    (void)param;
    nimble_port_run();               /* Trả về khi nimble_port_stop() được gọi. */
    nimble_port_freertos_deinit();
}

int obd_ble_init(void)
{
    esp_err_t e = nimble_port_init();
    if (e != ESP_OK) {
        ESP_LOGE(OBD_TAG, "nimble_port_init: %s", esp_err_to_name(e));
        return -1;
    }
    ble_hs_cfg.reset_cb = on_reset;
    ble_hs_cfg.sync_cb = on_sync;
    nimble_port_freertos_init(host_task);
    ESP_LOGI(OBD_TAG, "BLE on");
    return 0;
}

int obd_ble_deinit(void)
{
    int rc = nimble_port_stop();
    if (rc != 0) {
        ESP_LOGE(OBD_TAG, "nimble_port_stop: %d", rc);
        return -1;
    }
    esp_err_t e = nimble_port_deinit();
    if (e != ESP_OK) {
        ESP_LOGE(OBD_TAG, "nimble_port_deinit: %s", esp_err_to_name(e));
        return -1;
    }
    ESP_LOGI(OBD_TAG, "BLE off");
    return 0;
}
