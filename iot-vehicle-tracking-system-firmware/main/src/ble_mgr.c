#include "ble_mgr.h"

#include <stdbool.h>
#include <stddef.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/semphr.h"

#include "host/ble_gap.h"
#include "host/ble_gatt.h"
#include "host/ble_hs.h"
#include "host/ble_hs_adv.h"
#include "host/ble_store.h"
#include "host/ble_uuid.h"
#include "os/os_mbuf.h"

#include "esp_log.h"

#include "ble_init.h"
#include "ble_util.h"
#include "util.h"

/**
 * @file ble_mgr.c
 * @brief BLE central manager handling scan/connect/discovery/notify workflow.
 */

#define BLE_DISCOVERY_TIMEOUT_MS 5000U

/* CCCD payload enabling notifications (0x0001 little-endian). */
static const uint8_t cccd_notify_enable_cfg[] = {0x01, 0x00};

typedef struct {
    ble_mgr_status_t status;
} ble_mgr_result_t;

struct ble_mgr_ctx {
    uint16_t conn_handle;
    bool is_connected;
    bool is_connecting;
    const ble_mgr_disc_cfg_t *disc_cfg;
    void *usr_ctx;
    struct {
        bool svc_disc_completed;
        bool chr_disc_completed;
        bool chr_disc_started;
    } svc_disc_ctx;
    QueueHandle_t result_queue;
    SemaphoreHandle_t lock_mtx;
};

static const char *TAG = "BLE_MGR";

static ble_mgr_ctx_t s_mgr = {
    .conn_handle = BLE_HS_CONN_HANDLE_NONE,
    .is_connecting = false,
    .disc_cfg = NULL,
    .usr_ctx = NULL,
    .svc_disc_ctx = {.svc_disc_completed = false, .chr_disc_completed = false, .chr_disc_started = false},
    .result_queue = NULL,
    .lock_mtx = NULL,
};

static void ble_mgr_gap_stack_reset_cb(int reason);
static void ble_mgr_gap_stack_sync_cb(void);
static int ble_mgr_gap_event_cb(struct ble_gap_event *event, void *arg);
static int ble_mgr_gatt_svc_discovered_cb(uint16_t conn_handle,
                                          const struct ble_gatt_error *error,
                                          const struct ble_gatt_svc *service,
                                          void *arg);
static int ble_mgr_gatt_chr_discovered_cb(uint16_t conn_handle,
                                          const struct ble_gatt_error *error,
                                          const struct ble_gatt_chr *chr,
                                          void *arg);

static const ble_init_config_t s_ble_init_cfg = {
    .reset_cb = ble_mgr_gap_stack_reset_cb,
    .sync_cb = ble_mgr_gap_stack_sync_cb,
};

static const struct ble_gap_disc_params s_disc_params = {
    .passive = 1,
    .itvl = 0x0010,
    .window = 0x0010,
    .filter_duplicates = 1,
};

static const struct ble_gap_conn_params s_conn_params = {
    .scan_itvl = 0x0010,
    .scan_window = 0x0010,
    .itvl_min = 0x0010,
    .itvl_max = 0x0020,
    .latency = 0,
    .supervision_timeout = 0x0100,
    .min_ce_len = 0x0010,
    .max_ce_len = 0x0300,
};

/**
 * @brief Reset result queue before new async operation.
 *
 * @param mgr_ctx BLE manager context.
 */
static void ble_mgr_queue_clear(ble_mgr_ctx_t *mgr_ctx) {
    if (mgr_ctx != NULL && mgr_ctx->result_queue != NULL) {
        xQueueReset(mgr_ctx->result_queue);
    }
}

/**
 * @brief Send operation result to waiting task.
 *
 * @param mgr_ctx BLE manager context.
 * @param status Operation status.
 */
static void ble_mgr_queue_send(ble_mgr_ctx_t *mgr_ctx, ble_mgr_status_t status) {
    if (mgr_ctx == NULL || mgr_ctx->result_queue == NULL) {
        return;
    }

    ble_mgr_result_t result = {.status = status};
    xQueueOverwrite(mgr_ctx->result_queue, &result);
}

/**
 * @brief Wait for operation result posted by BLE callbacks.
 *
 * @param mgr_ctx BLE manager context.
 * @param status Optional output status.
 * @param timeout_ms Wait timeout.
 *
 * @return true when queue message received.
 */
static bool ble_mgr_queue_wait(ble_mgr_ctx_t *mgr_ctx, ble_mgr_status_t *status, uint32_t timeout_ms) {
    if (mgr_ctx == NULL || mgr_ctx->result_queue == NULL) {
        return false;
    }

    ble_mgr_result_t result = {.status = BLE_MGR_E_TIMEOUT};
    if (xQueueReceive(mgr_ctx->result_queue, &result, pdMS_TO_TICKS(timeout_ms)) != pdTRUE) {
        return false;
    }

    if (status != NULL) {
        *status = result.status;
    }
    return true;
}

/**
 * @brief Finalize connect/discovery operation and notify waiter.
 *
 * @param mgr_ctx BLE manager context.
 * @param status Final status.
 *
 * @return Same status input.
 */
static ble_mgr_status_t ble_mgr_connect_complete(ble_mgr_ctx_t *mgr_ctx, ble_mgr_status_t status) {
    if (mgr_ctx == NULL) {
        return BLE_MGR_E_NULL;
    }

    mgr_ctx->is_connecting = false;
    mgr_ctx->is_connected = (status == BLE_MGR_E_OK);
    if (status != BLE_MGR_E_OK) {
        mgr_ctx->conn_handle = BLE_HS_CONN_HANDLE_NONE;
    }
    ble_mgr_queue_send(mgr_ctx, status);
    return status;
}

/**
 * @brief NimBLE stack reset callback.
 *
 * @param reason Reset reason code.
 */
static void ble_mgr_gap_stack_reset_cb(int reason) {
    ESP_LOGW(TAG, "NimBLE stack reset, reason=%d", reason);
}

/**
 * @brief NimBLE sync callback used to release init wait.
 */
static void ble_mgr_gap_stack_sync_cb(void) {
    ESP_LOGI(TAG, "NimBLE stack synced");
    ble_mgr_queue_send(&s_mgr, BLE_MGR_E_OK);
}

/**
 * @brief Check whether advertisement payload includes target service UUID.
 *
 * @param adv_fields Parsed advertisement fields.
 * @param target_uuid UUID string to match.
 *
 * @return true when service UUID appears in adv payload.
 */
static bool ble_mgr_adv_contains_service(const struct ble_hs_adv_fields *adv_fields, const char *target_uuid) {
    if (adv_fields == NULL || target_uuid == NULL) {
        return false;
    }

    char uuid_str[BLE_UUID_STR_LEN] = {0};

    for (int i = 0; i < adv_fields->num_uuids16; ++i) {
        ble_uuid_to_str(&adv_fields->uuids16[i].u, uuid_str);
        if (strcmp(uuid_str, target_uuid) == 0) {
            return true;
        }
    }
    for (int i = 0; i < adv_fields->num_uuids32; ++i) {
        ble_uuid_to_str(&adv_fields->uuids32[i].u, uuid_str);
        if (strcmp(uuid_str, target_uuid) == 0) {
            return true;
        }
    }
    for (int i = 0; i < adv_fields->num_uuids128; ++i) {
        ble_uuid_to_str(&adv_fields->uuids128[i].u, uuid_str);
        if (strcmp(uuid_str, target_uuid) == 0) {
            return true;
        }
    }

    return false;
}

/**
 * @brief Route notification payload to matching characteristic callback.
 *
 * @param mgr_ctx BLE manager context.
 * @param om Notification mbuf.
 * @param attr_handle Characteristic handle.
 * @param conn_handle Connection handle (unused).
 * @param indication True when indication, false when notification (unused).
 */
static void ble_mgr_gap_notification_cb(ble_mgr_ctx_t *mgr_ctx,
                                        struct os_mbuf *om,
                                        uint16_t attr_handle,
                                        uint16_t conn_handle,
                                        bool indication) {
    (void)conn_handle;
    (void)indication;

    if (mgr_ctx == NULL || om == NULL || mgr_ctx->disc_cfg == NULL || mgr_ctx->disc_cfg->svc_def == NULL) {
        return;
    }

    const ble_mgr_svc_def_t *svc_def = mgr_ctx->disc_cfg->svc_def;
    for (size_t i = 0; i < svc_def->num_chars; ++i) {
        if (svc_def->chars[i].handle == attr_handle && svc_def->chars[i].notify_cb != NULL) {
            svc_def->chars[i].notify_cb(om->om_data, om->om_len, attr_handle, mgr_ctx->usr_ctx);
            return;
        }
    }
}

/**
 * @brief Evaluate discovery completion state and finalize connect flow.
 *
 * @param mgr_ctx BLE manager context.
 * @param error GATT discovery callback error descriptor.
 */
static void ble_mgr_gatt_svc_chr_disc_completed_check(ble_mgr_ctx_t *mgr_ctx,
                                                      const struct ble_gatt_error *error) {
    if (mgr_ctx == NULL || error == NULL) {
        return;
    }

    if (error->status == 0) {
        return;
    }

    if (error->status != BLE_HS_EDONE) {
        ESP_LOGE(TAG, "BLE discovery failed: %d", error->status);
        ble_mgr_connect_complete(mgr_ctx, BLE_MGR_E_DISCOVERY_FAILED);
        return;
    }

    if (mgr_ctx->svc_disc_ctx.chr_disc_started && !mgr_ctx->svc_disc_ctx.chr_disc_completed) {
        return;
    }

    if ((mgr_ctx->svc_disc_ctx.svc_disc_completed && mgr_ctx->svc_disc_ctx.chr_disc_completed) ||
        (!mgr_ctx->svc_disc_ctx.chr_disc_started && mgr_ctx->svc_disc_ctx.svc_disc_completed)) {
        /* Validate that all required characteristics were found. */
        const ble_mgr_svc_def_t *svc_def = mgr_ctx->disc_cfg->svc_def;
        bool missing_required_char = false;
        for (size_t i = 0; i < svc_def->num_chars; ++i) {
            if (svc_def->chars[i].handle == 0) {
                missing_required_char = true;
                break;
            }
        }

        if (missing_required_char) {
            ble_mgr_connect_complete(mgr_ctx, BLE_MGR_E_DISCOVERY_FAILED);
            return;
        }

        ble_mgr_connect_complete(mgr_ctx, BLE_MGR_E_OK);
    }
}

/**
 * @brief Characteristic discovery callback.
 *
 * @param conn_handle Active connection handle.
 * @param error Callback status.
 * @param chr Characteristic descriptor (when status == 0).
 * @param arg BLE manager context.
 *
 * @return 0 to continue NimBLE callback flow.
 */
static int ble_mgr_gatt_chr_discovered_cb(uint16_t conn_handle,
                                          const struct ble_gatt_error *error,
                                          const struct ble_gatt_chr *chr,
                                          void *arg) {
    ble_mgr_ctx_t *mgr_ctx = (ble_mgr_ctx_t *)arg;
    if (mgr_ctx == NULL || error == NULL || mgr_ctx->disc_cfg == NULL || mgr_ctx->disc_cfg->svc_def == NULL) {
        return 0;
    }

    if (error->status == 0 && chr != NULL) {
        char uuid_str[BLE_UUID_STR_LEN] = {0};
        ble_uuid_to_str(&chr->uuid.u, uuid_str);

        for (size_t i = 0; i < mgr_ctx->disc_cfg->svc_def->num_chars; ++i) {
            ble_gatt_char_def_t *char_def = &mgr_ctx->disc_cfg->svc_def->chars[i];
            if (char_def->uuid == NULL || strcmp(uuid_str, char_def->uuid) != 0) {
                continue;
            }

            /* Save characteristic value handle for future writes/notifications. */
            char_def->handle = chr->val_handle;
            if (char_def->notify_cb != NULL) {
                /* Subscribe by writing CCCD at handle + 1 for this profile. */
                int rc = ble_gattc_write_flat(conn_handle,
                                              chr->val_handle + 1,
                                              cccd_notify_enable_cfg,
                                              sizeof(cccd_notify_enable_cfg),
                                              NULL,
                                              NULL);
                if (rc != 0) {
                    ESP_LOGW(TAG, "Failed to subscribe to notifications: %d", rc);
                }
            }
            break;
        }

        return 0;
    }

    if (error->status == BLE_HS_EDONE) {
        mgr_ctx->svc_disc_ctx.chr_disc_completed = true;
        ble_mgr_gatt_svc_chr_disc_completed_check(mgr_ctx, error);
    } else {
        ble_mgr_connect_complete(mgr_ctx, BLE_MGR_E_DISCOVERY_FAILED);
    }

    return 0;
}

/**
 * @brief Service discovery callback.
 *
 * @param conn_handle Active connection handle.
 * @param error Callback status.
 * @param service Service descriptor (when status == 0).
 * @param arg BLE manager context.
 *
 * @return 0 to continue NimBLE callback flow.
 */
static int ble_mgr_gatt_svc_discovered_cb(uint16_t conn_handle,
                                          const struct ble_gatt_error *error,
                                          const struct ble_gatt_svc *service,
                                          void *arg) {
    ble_mgr_ctx_t *mgr_ctx = (ble_mgr_ctx_t *)arg;
    if (mgr_ctx == NULL || error == NULL || mgr_ctx->disc_cfg == NULL || mgr_ctx->disc_cfg->svc_def == NULL) {
        return 0;
    }

    if (error->status == 0 && service != NULL) {
        char uuid_str[BLE_UUID_STR_LEN] = {0};
        ble_uuid_to_str(&service->uuid.u, uuid_str);

        if (strcmp(uuid_str, mgr_ctx->disc_cfg->svc_def->service_uuid) == 0) {
            /* Start characteristic discovery only for requested service. */
            mgr_ctx->svc_disc_ctx.chr_disc_started = true;
            int rc = ble_gattc_disc_all_chrs(conn_handle,
                                             service->start_handle,
                                             service->end_handle,
                                             ble_mgr_gatt_chr_discovered_cb,
                                             mgr_ctx);
            if (rc != 0) {
                ESP_LOGE(TAG, "Characteristic discovery start failed: %d", rc);
                ble_mgr_connect_complete(mgr_ctx, BLE_MGR_E_DISCOVERY_FAILED);
            }
        }

        return 0;
    }

    mgr_ctx->svc_disc_ctx.svc_disc_completed = true;
    ble_mgr_gatt_svc_chr_disc_completed_check(mgr_ctx, error);
    return 0;
}

/**
 * @brief Process GAP connect completion event.
 *
 * @param mgr_ctx BLE manager context.
 * @param conn_handle Connection handle.
 * @param status BLE status code (0 on success).
 */
static void ble_mgr_gap_connected_cb(ble_mgr_ctx_t *mgr_ctx, uint16_t conn_handle, int status) {
    if (mgr_ctx == NULL) {
        return;
    }

    if (status != 0) {
        ESP_LOGW(TAG, "BLE connection failed: %d", status);
        ble_mgr_connect_complete(mgr_ctx, BLE_MGR_E_NOT_CONNECTED);

        /* Resume scanning to find next candidate after failed connect. */
        int rc = ble_gap_disc(0, BLE_DISCOVERY_TIMEOUT_MS, &s_disc_params, ble_mgr_gap_event_cb, mgr_ctx);
        if (rc != 0) {
            ESP_LOGW(TAG, "Failed to restart discovery after connect failure: %d", rc);
        }
        return;
    }

    mgr_ctx->conn_handle = conn_handle;
    mgr_ctx->svc_disc_ctx.svc_disc_completed = false;
    mgr_ctx->svc_disc_ctx.chr_disc_completed = false;
    mgr_ctx->svc_disc_ctx.chr_disc_started = false;

    /* After connection, discover all services then drill into required one. */
    int rc = ble_gattc_disc_all_svcs(conn_handle, ble_mgr_gatt_svc_discovered_cb, mgr_ctx);
    if (rc != 0) {
        ESP_LOGE(TAG, "Service discovery start failed: %d", rc);
        ble_mgr_connect_complete(mgr_ctx, BLE_MGR_E_DISCOVERY_FAILED);
    }
}

/**
 * @brief Unified GAP event handler.
 *
 * @param event GAP event object.
 * @param arg BLE manager context.
 *
 * @return 0 to keep NimBLE processing.
 */
static int ble_mgr_gap_event_cb(struct ble_gap_event *event, void *arg) {
    ble_mgr_ctx_t *mgr_ctx = (ble_mgr_ctx_t *)arg;
    if (mgr_ctx == NULL || mgr_ctx->disc_cfg == NULL || mgr_ctx->disc_cfg->svc_def == NULL) {
        return 0;
    }

    switch (event->type) {
        case BLE_GAP_EVENT_DISC: {
            if (mgr_ctx->is_connecting || mgr_ctx->is_connected) {
                break;
            }

            /* Parse advertisement payload and check target service UUID. */
            struct ble_hs_adv_fields adv_fields;
            int rc = ble_hs_adv_parse_fields(&adv_fields, event->disc.data, event->disc.length_data);
            if (rc != 0) {
                break;
            }

            if (!ble_mgr_adv_contains_service(&adv_fields, mgr_ctx->disc_cfg->svc_def->service_uuid)) {
                break;
            }

            bool connect = true;
            if (mgr_ctx->disc_cfg->dev_filter_cb != NULL) {
                connect = mgr_ctx->disc_cfg->dev_filter_cb(mgr_ctx, &event->disc.addr, mgr_ctx->usr_ctx);
            }
            if (!connect) {
                break;
            }

            /* Stop scan and initiate connection to selected peripheral. */
            mgr_ctx->is_connecting = true;
            ble_gap_disc_cancel();
            ble_mgr_queue_clear(mgr_ctx);
            rc = ble_gap_connect(BLE_OWN_ADDR_PUBLIC,
                                 &event->disc.addr,
                                 30000,
                                 &s_conn_params,
                                 ble_mgr_gap_event_cb,
                                 mgr_ctx);
            if (rc != 0) {
                mgr_ctx->is_connecting = false;
                ble_mgr_connect_complete(mgr_ctx, BLE_MGR_E_NOT_CONNECTED);
            }
            break;
        }

        case BLE_GAP_EVENT_DISC_COMPLETE:
            /* Keep discovery alive when nothing is connecting/connected. */
            if (!mgr_ctx->is_connecting && !mgr_ctx->is_connected) {
                int rc = ble_gap_disc(0, BLE_DISCOVERY_TIMEOUT_MS, &s_disc_params, ble_mgr_gap_event_cb, mgr_ctx);
                if (rc != 0) {
                    ESP_LOGW(TAG, "Failed to restart discovery: %d", rc);
                }
            }
            break;

        case BLE_GAP_EVENT_CONNECT:
            ble_mgr_gap_connected_cb(mgr_ctx, event->connect.conn_handle, event->connect.status);
            break;

        case BLE_GAP_EVENT_DISCONNECT:
            /* Clear connection state and optionally restart discovery by policy. */
            mgr_ctx->conn_handle = BLE_HS_CONN_HANDLE_NONE;
            mgr_ctx->is_connected = false;
            mgr_ctx->is_connecting = false;
            if (mgr_ctx->disc_cfg->disconnected_cb != NULL &&
                mgr_ctx->disc_cfg->disconnected_cb(mgr_ctx, mgr_ctx->usr_ctx)) {
                int rc = ble_gap_disc(0, BLE_DISCOVERY_TIMEOUT_MS, &s_disc_params, ble_mgr_gap_event_cb, mgr_ctx);
                if (rc != 0) {
                    ESP_LOGW(TAG, "Failed to restart discovery after disconnect: %d", rc);
                }
            }
            break;

        case BLE_GAP_EVENT_NOTIFY_RX:
            ble_mgr_gap_notification_cb(mgr_ctx,
                                        event->notify_rx.om,
                                        event->notify_rx.attr_handle,
                                        event->notify_rx.conn_handle,
                                        (bool)event->notify_rx.indication);
            break;

        case BLE_GAP_EVENT_MTU:
        case BLE_GAP_EVENT_LINK_ESTAB:
            break;

        default:
            break;
    }

    return 0;
}

/**
 * @brief Convert BLE manager status enum to readable string.
 *
 * @param status Status enum.
 *
 * @return Constant string.
 */
const char *ble_mgr_status_to_string(ble_mgr_status_t status) {
    switch (status) {
        case BLE_MGR_E_OK:
            return "OK";
        case BLE_MGR_E_NULL:
            return "NULL";
        case BLE_MGR_E_TIMEOUT:
            return "TIMEOUT";
        case BLE_MGR_E_NOT_CONNECTED:
            return "NOT_CONNECTED";
        case BLE_MGR_E_DISCOVERY_FAILED:
            return "DISCOVERY_FAILED";
        case BLE_MGR_E_GATT_SEND_FAILED:
            return "GATT_SEND_FAILED";
        case BLE_MGR_E_API_LOCK_ERROR:
            return "API_LOCK_ERROR";
        default:
            return "UNKNOWN";
    }
}

/**
 * @brief Initialize BLE manager singleton and wait for NimBLE sync.
 *
 * @param timeout_ms Timeout waiting for sync signal.
 *
 * @return Context pointer on success, NULL on failure.
 */
ble_mgr_ctx_t *ble_mgr_init(uint32_t timeout_ms) {
    ble_mgr_ctx_t *mgr_ctx = &s_mgr;

    if (mgr_ctx->lock_mtx != NULL) {
        return mgr_ctx;
    }

    /* Mutex protects all public BLE manager API calls. */
    mgr_ctx->lock_mtx = xSemaphoreCreateMutex();
    ESP_RETURN_ON_NULL(mgr_ctx->lock_mtx, NULL, TAG, "Failed to create BLE mutex");

    if (xSemaphoreTake(mgr_ctx->lock_mtx, 0) != pdTRUE) {
        vSemaphoreDelete(mgr_ctx->lock_mtx);
        mgr_ctx->lock_mtx = NULL;
        return NULL;
    }

    /* Single-slot queue acts like mailbox for async completion status. */
    mgr_ctx->result_queue = xQueueCreate(1, sizeof(ble_mgr_result_t));
    if (mgr_ctx->result_queue == NULL) {
        xSemaphoreGive(mgr_ctx->lock_mtx);
        vSemaphoreDelete(mgr_ctx->lock_mtx);
        mgr_ctx->lock_mtx = NULL;
        return NULL;
    }

    ble_mgr_queue_clear(mgr_ctx);
    /* Start BLE stack then wait for sync callback to post queue result. */
    esp_err_t err = ble_init_stack(&s_ble_init_cfg);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "BLE stack init failed: %s", esp_err_to_name(err));
        xQueueReset(mgr_ctx->result_queue);
        vQueueDelete(mgr_ctx->result_queue);
        mgr_ctx->result_queue = NULL;
        mgr_ctx->disc_cfg = NULL;
        mgr_ctx->usr_ctx = NULL;
        mgr_ctx->is_connecting = false;
        mgr_ctx->is_connected = false;
        mgr_ctx->conn_handle = BLE_HS_CONN_HANDLE_NONE;
        xSemaphoreGive(mgr_ctx->lock_mtx);
        vSemaphoreDelete(mgr_ctx->lock_mtx);
        mgr_ctx->lock_mtx = NULL;
        return NULL;
    }

    bool wait_ok = ble_mgr_queue_wait(mgr_ctx, NULL, timeout_ms);
    if (!wait_ok) {
        ESP_LOGE(TAG, "Timed out waiting for BLE stack sync");
        (void)ble_stack_deinit();
        xQueueReset(mgr_ctx->result_queue);
        vQueueDelete(mgr_ctx->result_queue);
        mgr_ctx->result_queue = NULL;
        mgr_ctx->disc_cfg = NULL;
        mgr_ctx->usr_ctx = NULL;
        mgr_ctx->is_connecting = false;
        mgr_ctx->is_connected = false;
        mgr_ctx->conn_handle = BLE_HS_CONN_HANDLE_NONE;
        xSemaphoreGive(mgr_ctx->lock_mtx);
        vSemaphoreDelete(mgr_ctx->lock_mtx);
        mgr_ctx->lock_mtx = NULL;
        return NULL;
    }

    xSemaphoreGive(mgr_ctx->lock_mtx);
    return mgr_ctx;
}

/**
 * @brief Scan, connect, and discover one target BLE service profile.
 *
 * @param mgr_ctx BLE manager context.
 * @param disc_cfg Discovery configuration.
 * @param timeout_ms Completion timeout.
 * @param usr_ctx User context passed to callbacks.
 *
 * @return BLE manager status.
 */
ble_mgr_status_t ble_mgr_connect_service(ble_mgr_ctx_t *mgr_ctx,
                                         const ble_mgr_disc_cfg_t *disc_cfg,
                                         uint32_t timeout_ms,
                                         void *usr_ctx) {
    if (mgr_ctx == NULL || disc_cfg == NULL || disc_cfg->svc_def == NULL) {
        return BLE_MGR_E_NULL;
    }

    if (xSemaphoreTake(mgr_ctx->lock_mtx, 0) != pdTRUE) {
        return BLE_MGR_E_API_LOCK_ERROR;
    }

    mgr_ctx->conn_handle = BLE_HS_CONN_HANDLE_NONE;
    mgr_ctx->is_connected = false;
    mgr_ctx->is_connecting = false;
    mgr_ctx->disc_cfg = disc_cfg;
    mgr_ctx->usr_ctx = usr_ctx;

    /* Clear previous characteristic handles before new discovery pass. */
    for (size_t i = 0; i < disc_cfg->svc_def->num_chars; ++i) {
        disc_cfg->svc_def->chars[i].handle = 0;
    }

    ble_mgr_queue_clear(mgr_ctx);
    mgr_ctx->svc_disc_ctx.svc_disc_completed = false;
    mgr_ctx->svc_disc_ctx.chr_disc_completed = false;
    mgr_ctx->svc_disc_ctx.chr_disc_started = false;

    /* Start passive scan loop. */
    int rc = ble_gap_disc(0, BLE_DISCOVERY_TIMEOUT_MS, &s_disc_params, ble_mgr_gap_event_cb, mgr_ctx);
    if (rc != 0) {
        xSemaphoreGive(mgr_ctx->lock_mtx);
        return BLE_MGR_E_DISCOVERY_FAILED;
    }

    ble_mgr_status_t status = BLE_MGR_E_OK;
    if (!ble_mgr_queue_wait(mgr_ctx, &status, timeout_ms)) {
        ble_gap_disc_cancel();
        xSemaphoreGive(mgr_ctx->lock_mtx);
        return BLE_MGR_E_TIMEOUT;
    }

    xSemaphoreGive(mgr_ctx->lock_mtx);
    return status;
}

/**
 * @brief Send GATT write to characteristic handle.
 *
 * @param mgr_ctx BLE manager context.
 * @param chr_handle Characteristic value handle.
 * @param data Payload buffer.
 * @param len Payload length.
 *
 * @return BLE manager status.
 */
ble_mgr_status_t ble_mgr_send(ble_mgr_ctx_t *mgr_ctx, uint16_t chr_handle, const char *data, size_t len) {
    if (mgr_ctx == NULL || data == NULL) {
        return BLE_MGR_E_NULL;
    }

    if (xSemaphoreTake(mgr_ctx->lock_mtx, 0) != pdTRUE) {
        return BLE_MGR_E_API_LOCK_ERROR;
    }

    if (!mgr_ctx->is_connected) {
        xSemaphoreGive(mgr_ctx->lock_mtx);
        return BLE_MGR_E_NOT_CONNECTED;
    }

    int rc = ble_gattc_write_flat(mgr_ctx->conn_handle, chr_handle, data, len, NULL, NULL);
    xSemaphoreGive(mgr_ctx->lock_mtx);
    return rc == 0 ? BLE_MGR_E_OK : BLE_MGR_E_GATT_SEND_FAILED;
}

/**
 * @brief Check active connection state.
 *
 * @param mgr_ctx BLE manager context.
 *
 * @return true when connected.
 */
bool ble_mgr_is_connected(ble_mgr_ctx_t *mgr_ctx) {
    return mgr_ctx != NULL && mgr_ctx->is_connected;
}

/**
 * @brief Disconnect active BLE link.
 *
 * @param mgr_ctx BLE manager context.
 *
 * @return ESP_OK on success, otherwise error.
 */
esp_err_t ble_mgr_disconnect(ble_mgr_ctx_t *mgr_ctx) {
    ESP_RETURN_ON_NULL(mgr_ctx, ESP_ERR_INVALID_ARG, TAG, "context is NULL");

    if (!mgr_ctx->is_connected) {
        return ESP_OK;
    }

    int rc = ble_gap_terminate(mgr_ctx->conn_handle, BLE_ERR_REM_USER_CONN_TERM);
    if (rc != 0) {
        return ESP_FAIL;
    }

    mgr_ctx->is_connected = false;
    mgr_ctx->conn_handle = BLE_HS_CONN_HANDLE_NONE;
    return ESP_OK;
}
