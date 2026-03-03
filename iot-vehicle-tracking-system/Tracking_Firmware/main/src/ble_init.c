#include "ble_init.h"

#include <stdbool.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"

#include "esp_log.h"

#include "esp_nimble_hci.h"

#include "host/ble_hs.h"
#include "host/ble_store.h"
#include "nimble/nimble_port.h"

#include "util.h"

static const char *TAG = "BLE_INIT";

static TaskHandle_t s_ble_task_handle = NULL;
static SemaphoreHandle_t s_ble_stop_sem = NULL;
static bool s_stack_started = false;

void ble_store_config_init(void);

static void ble_task(void *param) {
    (void)param;
    ESP_LOGI(TAG, "NimBLE host task started");
    nimble_port_run();
    if (s_ble_stop_sem != NULL) {
        xSemaphoreGive(s_ble_stop_sem);
    }
    nimble_port_freertos_deinit();
}

static void default_reset_cb(int reason) {
    ESP_LOGW(TAG, "NimBLE reset reason=%d", reason);
}

static void default_sync_cb(void) {
    ESP_LOGI(TAG, "NimBLE host synced");
}

esp_err_t ble_init_stack(const ble_init_config_t *config) {
    ESP_RETURN_ON_NULL(config, ESP_ERR_INVALID_ARG, TAG, "config is NULL");

    if (s_stack_started) {
        return ESP_OK;
    }

    esp_err_t err = esp_nimble_hci_init();
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "esp_nimble_hci_init failed");

    err = nimble_port_init();
    if (err != ESP_OK) {
        esp_nimble_hci_deinit();
    }
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "nimble_port_init failed");

    ble_hs_cfg.reset_cb = config->reset_cb;
    ble_hs_cfg.sync_cb = config->sync_cb;
    ble_hs_cfg.store_status_cb = ble_store_util_status_rr;
    ble_store_config_init();

    s_ble_stop_sem = xSemaphoreCreateBinary();
    if (s_ble_stop_sem == NULL) {
        nimble_port_deinit();
        esp_nimble_hci_deinit();
        ESP_LOGE(TAG, "Failed to create BLE stop semaphore");
        return ESP_ERR_NO_MEM;
    }

    BaseType_t task_result = xTaskCreate(ble_task, "nimble_host", 4096, NULL, 5, &s_ble_task_handle);
    if (task_result != pdPASS) {
        vSemaphoreDelete(s_ble_stop_sem);
        s_ble_stop_sem = NULL;
        nimble_port_deinit();
        esp_nimble_hci_deinit();
    }
    ESP_RETURN_ON_FALSE(task_result == pdPASS, ESP_FAIL, TAG, "Failed to create NimBLE task");

    s_stack_started = true;
    return ESP_OK;
}

esp_err_t ble_stack_init(void) {
    static ble_init_config_t config = {
        .reset_cb = default_reset_cb,
        .sync_cb = default_sync_cb,
    };
    return ble_init_stack(&config);
}

esp_err_t ble_stack_deinit(void) {
    if (!s_stack_started) {
        return ESP_OK;
    }

    nimble_port_stop();
    if (s_ble_stop_sem != NULL) {
        if (xSemaphoreTake(s_ble_stop_sem, pdMS_TO_TICKS(1000)) != pdTRUE) {
            ESP_LOGW(TAG, "Timed out waiting for NimBLE host task to stop");
        }
        vSemaphoreDelete(s_ble_stop_sem);
        s_ble_stop_sem = NULL;
    }

    nimble_port_deinit();
    esp_nimble_hci_deinit();
    s_ble_task_handle = NULL;
    s_stack_started = false;
    ESP_LOGI(TAG, "NimBLE stack deinitialized");
    return ESP_OK;
}
