#include "ble_init.h"

#include <stdbool.h>

#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"

#include "esp_bt.h"
#include "esp_log.h"

#include "host/ble_hs.h"
#include "host/ble_store.h"
#include "nimble/nimble_port.h"
#include "nimble/nimble_port_freertos.h"

#include "util.h"

/**
 * @file ble_init.c
 * @brief NimBLE host stack startup/shutdown sequence for ESP-IDF.
 * This translation unit belongs to the BLE OBD NimBLE adapter layer and keeps adapter-local state, protocol sequencing, and recovery policy isolated behind the exported entry points.
 */


static const char *TAG = "BLE_INIT";
static const UBaseType_t BLE_HOST_TASK_PRIORITY = (UBaseType_t)(configMAX_PRIORITIES - 4);

/**
 * @brief Convert controller status enum to readable text.
 */
static const char *ble_controller_status_to_str(esp_bt_controller_status_t status) {
    switch (status) {
        case ESP_BT_CONTROLLER_STATUS_IDLE:
            return "IDLE";
        case ESP_BT_CONTROLLER_STATUS_INITED:
            return "INITED";
        case ESP_BT_CONTROLLER_STATUS_ENABLED:
            return "ENABLED";
        default:
            return "UNKNOWN";
    }
}

/**
 * @brief Log BLE init stage with current controller status.
 */
static void ble_log_controller_stage(const char *stage) {
    // Log the controller bring-up stage here so BLE stack bootstrap failures are easier to pinpoint.
    esp_bt_controller_status_t status = esp_bt_controller_get_status();
    ESP_LOGI(TAG,
             "event=ble_init_stage stage=%s controller_status=%s status_code=%d",
             stage,
             ble_controller_status_to_str(status),
             (int)status);
}

/* Semaphore used to signal task stop completion during deinit. */
static SemaphoreHandle_t s_ble_stop_sem = NULL;
/* Global stack state guard. */
static bool s_stack_started = false;

/* Provided by NimBLE utility module and required for key storage support. */
void ble_store_config_init(void);

/**
 * @brief FreeRTOS task wrapper running NimBLE host loop.
 *
 * @param param Unused.
 */
static void ble_task(void *param) {
    (void)param;
    ESP_LOGI(TAG, "event=nimble_host_task_started");

    /* Blocks until `nimble_port_stop()` is called. */
    nimble_port_run();

    /* Notify deinit path that host loop has exited. */
    if (s_ble_stop_sem != NULL) {
        xSemaphoreGive(s_ble_stop_sem);
    }

    /* Release NimBLE RTOS resources associated with host task. */
    nimble_port_freertos_deinit();

    /* Task was created with xTaskCreate, so it must self-delete instead of returning. */
    vTaskDelete(NULL);
}

static BaseType_t ble_host_task_core(void) {
    return CONFIG_BT_NIMBLE_PINNED_TO_CORE < portNUM_PROCESSORS ? CONFIG_BT_NIMBLE_PINNED_TO_CORE : tskNO_AFFINITY;
}

/**
 * @brief Default stack reset callback used when caller does not supply one.
 *
 * @param reason NimBLE reset reason code.
 */
static void default_reset_cb(int reason) {
    ESP_LOGW(TAG, "event=nimble_reset reason=%d", reason);
}

/**
 * @brief Default stack sync callback used when caller does not supply one.
 */
static void default_sync_cb(void) {
    ESP_LOGI(TAG, "event=nimble_host_synced");
}

/**
 * @brief Initialize NimBLE stack with custom callbacks.
 *
 * @param config Callback configuration.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t ble_init_stack(const ble_init_config_t *config) {
    ESP_RETURN_ON_NULL(config, ESP_ERR_INVALID_ARG, TAG, "config is NULL");

    ble_log_controller_stage("enter");

    /* Idempotent init: repeated calls are accepted. */
    if (s_stack_started) {
        ESP_LOGW(TAG, "event=ble_stack_init_skipped reason=already_started");
        ble_log_controller_stage("already-started");
        return ESP_OK;
    }

    /* Initialize NimBLE host + controller stack. */
    ble_log_controller_stage("before-nimble_port_init");
    esp_err_t err = nimble_port_init();
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "event=nimble_port_init_failed err=%s", esp_err_to_name(err));
        ble_log_controller_stage("after-nimble_port_init-fail");
        return err;
    }
    ble_log_controller_stage("after-nimble_port_init-ok");

    /* Install callbacks and persistent key store hooks. */
    ble_hs_cfg.reset_cb = config->reset_cb;
    ble_hs_cfg.sync_cb = config->sync_cb;
    ble_hs_cfg.store_status_cb = ble_store_util_status_rr;
    ble_store_config_init();

    /* Create stop semaphore used to wait for host task termination. */
    s_ble_stop_sem = xSemaphoreCreateBinary();
    if (s_ble_stop_sem == NULL) {
        nimble_port_deinit();
        ESP_LOGE(TAG, "event=ble_stop_semaphore_create_failed");
        return ESP_ERR_NO_MEM;
    }

    /* Keep host task affinity/priority aligned with the ESP-IDF NimBLE port. */
    BaseType_t host_core = ble_host_task_core();
    ESP_LOGI(TAG,
             "event=nimble_host_task_create stack=%u priority=%u core=%ld",
             (unsigned)CONFIG_BT_NIMBLE_HOST_TASK_STACK_SIZE,
             (unsigned)BLE_HOST_TASK_PRIORITY,
             (long)host_core);
    BaseType_t task_result = xTaskCreatePinnedToCore(ble_task,
                                                     "nimble_host",
                                                     CONFIG_BT_NIMBLE_HOST_TASK_STACK_SIZE,
                                                     NULL,
                                                     BLE_HOST_TASK_PRIORITY,
                                                     NULL,
                                                     host_core);
    if (task_result != pdPASS) {
        /* Full rollback when task creation fails. */
        vSemaphoreDelete(s_ble_stop_sem);
        s_ble_stop_sem = NULL;
        nimble_port_deinit();
        ble_log_controller_stage("after-task-create-fail");
        return ESP_FAIL;
    }

    s_stack_started = true;
    ble_log_controller_stage("init-success");
    return ESP_OK;
}

/**
 * @brief Initialize NimBLE stack with built-in callbacks.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t ble_stack_init(void) {
    static ble_init_config_t config = {
        .reset_cb = default_reset_cb,
        .sync_cb = default_sync_cb,
    };
    return ble_init_stack(&config);
}

bool ble_stack_is_started(void) {
    return s_stack_started;
}

/**
 * @brief Stop NimBLE host task and release stack resources.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t ble_stack_deinit(void) {
    ble_log_controller_stage("deinit-enter");

    /* Idempotent deinit for safe repeated calls. */
    if (!s_stack_started) {
        ESP_LOGW(TAG, "event=ble_stack_deinit_skipped reason=not_started");
        return ESP_OK;
    }

    /* Request host loop stop. */
    nimble_port_stop();
    if (s_ble_stop_sem != NULL) {
        /* Wait briefly for host task graceful exit. */
        if (xSemaphoreTake(s_ble_stop_sem, pdMS_TO_TICKS(1000)) != pdTRUE) {
            ESP_LOGW(TAG, "event=nimble_host_task_stop_timeout");
        }
        vSemaphoreDelete(s_ble_stop_sem);
        s_ble_stop_sem = NULL;
    }

    /* Deinitialize host and controller stack. */
    nimble_port_deinit();
    s_stack_started = false;
    ble_log_controller_stage("deinit-done");
    ESP_LOGI(TAG, "event=nimble_stack_deinitialized");
    return ESP_OK;
}
