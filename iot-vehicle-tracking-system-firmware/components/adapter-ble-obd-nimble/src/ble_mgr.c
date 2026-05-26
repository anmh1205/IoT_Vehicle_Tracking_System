#include "ble_mgr.h"

#include <stdbool.h>
#include <stddef.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/semphr.h"
#include "freertos/task.h"

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
 * This translation unit belongs to the BLE OBD NimBLE adapter layer and keeps adapter-local state, protocol sequencing, and recovery policy isolated behind the exported entry points.
 */


#define BLE_DISCOVERY_TIMEOUT_MS 5000U
#define BLE_CONNECT_ATTEMPT_TIMEOUT_MS 7000U
#define BLE_DISCONNECT_WAIT_MS 1200U
#define BLE_DISCONNECT_POLL_MS 20U

/* CCCD payload enabling notifications (0x0001 little-endian). */
static const uint8_t cccd_notify_enable_cfg[] = {0x01, 0x00};

typedef struct {
    ble_mgr_status_t status;
} ble_mgr_result_t;

struct ble_mgr_ctx {
    uint16_t conn_handle;
    bool is_connected;
    bool is_connecting;
    bool peer_addr_valid;
    ble_addr_t peer_addr;
    const ble_mgr_disc_cfg_t *disc_cfg;
    void *usr_ctx;
    struct {
        ble_addr_t addr;
        int8_t rssi;
        bool service_match;
        bool armed;
    } pending_connect;
    struct {
        uint32_t adv_seen;
        uint32_t parse_failures;
        uint32_t connect_matches;
    } scan_diag;
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
static ble_mgr_status_t ble_mgr_start_pending_connect(ble_mgr_ctx_t *mgr_ctx);
static int ble_mgr_gatt_svc_discovered_cb(uint16_t conn_handle,
                                          const struct ble_gatt_error *error,
                                          const struct ble_gatt_svc *service,
                                          void *arg);
static int ble_mgr_gatt_chr_discovered_cb(uint16_t conn_handle,
                                          const struct ble_gatt_error *error,
                                          const struct ble_gatt_chr *chr,
                                          void *arg);
static size_t ble_mgr_copy_adv_name(const struct ble_hs_adv_fields *adv_fields, char *buf, size_t buf_len);

static const ble_init_config_t s_ble_init_cfg = {
    .reset_cb = ble_mgr_gap_stack_reset_cb,
    .sync_cb = ble_mgr_gap_stack_sync_cb,
};

static const struct ble_gap_disc_params s_disc_params = {
    .passive = 0,
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
 * @brief Copy advertised local name into a null-terminated buffer.
 */
static size_t ble_mgr_copy_adv_name(const struct ble_hs_adv_fields *adv_fields, char *buf, size_t buf_len) {
    if (buf == NULL || buf_len == 0) {
        return 0;
    }

    buf[0] = '\0';
    if (adv_fields == NULL || adv_fields->name == NULL || adv_fields->name_len == 0) {
        return 0;
    }

    size_t copy_len = MIN_VALUE((size_t)adv_fields->name_len, buf_len - 1U);
    memcpy(buf, adv_fields->name, copy_len);
    buf[copy_len] = '\0';
    return copy_len;
}

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
    // Push mgr send through the shared publish path so metadata and error handling stay aligned.
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

static void ble_mgr_reset_context(ble_mgr_ctx_t *mgr_ctx) {
    if (mgr_ctx == NULL) {
        return;
    }

    if (mgr_ctx->result_queue != NULL) {
        xQueueReset(mgr_ctx->result_queue);
        vQueueDelete(mgr_ctx->result_queue);
        mgr_ctx->result_queue = NULL;
    }
    if (mgr_ctx->lock_mtx != NULL) {
        vSemaphoreDelete(mgr_ctx->lock_mtx);
        mgr_ctx->lock_mtx = NULL;
    }

    mgr_ctx->disc_cfg = NULL;
    mgr_ctx->usr_ctx = NULL;
    mgr_ctx->is_connecting = false;
    mgr_ctx->is_connected = false;
    mgr_ctx->peer_addr_valid = false;
    mgr_ctx->conn_handle = BLE_HS_CONN_HANDLE_NONE;
    memset(&mgr_ctx->peer_addr, 0, sizeof(mgr_ctx->peer_addr));
    memset(&mgr_ctx->pending_connect, 0, sizeof(mgr_ctx->pending_connect));
    memset(&mgr_ctx->scan_diag, 0, sizeof(mgr_ctx->scan_diag));
    mgr_ctx->svc_disc_ctx.svc_disc_completed = false;
    mgr_ctx->svc_disc_ctx.chr_disc_completed = false;
    mgr_ctx->svc_disc_ctx.chr_disc_started = false;
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
    mgr_ctx->pending_connect.armed = false;
    if (status != BLE_MGR_E_OK) {
        mgr_ctx->conn_handle = BLE_HS_CONN_HANDLE_NONE;
    }
    ble_mgr_queue_send(mgr_ctx, status);
    return status;
}

static ble_mgr_status_t ble_mgr_start_pending_connect(ble_mgr_ctx_t *mgr_ctx) {
    if (mgr_ctx == NULL || !mgr_ctx->pending_connect.armed) {
        return BLE_MGR_E_NULL;
    }

    char addr_str[BLE_ADDR_STR_LEN] = {0};
    (void)ble_addr_to_str(&mgr_ctx->pending_connect.addr, addr_str);
    ESP_LOGI(TAG,
             "event=ble_connect_start addr=%s rssi=%d service_match=%d",
             addr_str,
             mgr_ctx->pending_connect.rssi,
             mgr_ctx->pending_connect.service_match ? 1 : 0);

    ble_mgr_queue_clear(mgr_ctx);
    int rc = ble_gap_connect(BLE_OWN_ADDR_PUBLIC,
                             &mgr_ctx->pending_connect.addr,
                             BLE_CONNECT_ATTEMPT_TIMEOUT_MS,
                             &s_conn_params,
                             ble_mgr_gap_event_cb,
                             mgr_ctx);
    if (rc != 0) {
        ESP_LOGW(TAG, "event=ble_connect_start_failed addr=%s rc=%d", addr_str, rc);
        mgr_ctx->pending_connect.armed = false;
        mgr_ctx->is_connecting = false;
        return BLE_MGR_E_NOT_CONNECTED;
    }

    mgr_ctx->pending_connect.armed = false;
    return BLE_MGR_E_OK;
}

/**
 * @brief NimBLE stack reset callback.
 *
 * @param reason Reset reason code.
 */
static void ble_mgr_gap_stack_reset_cb(int reason) {
    ESP_LOGW(TAG, "event=nimble_stack_reset reason=%d", reason);
}

/**
 * @brief NimBLE sync callback used to release init wait.
 */
static void ble_mgr_gap_stack_sync_cb(void) {
    ESP_LOGI(TAG, "event=nimble_stack_synced");
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
        ESP_LOGE(TAG, "event=ble_discovery_failed status=%d", error->status);
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
                    ESP_LOGW(TAG, "event=ble_notify_subscribe_failed rc=%d", rc);
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
                ESP_LOGE(TAG, "event=ble_characteristic_discovery_start_failed rc=%d", rc);
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
        ESP_LOGW(TAG, "event=ble_connect_failed status=%d", status);
        ble_mgr_connect_complete(mgr_ctx, BLE_MGR_E_NOT_CONNECTED);

        /* Resume scanning to find next candidate after failed connect. */
        int rc = ble_gap_disc(0, BLE_DISCOVERY_TIMEOUT_MS, &s_disc_params, ble_mgr_gap_event_cb, mgr_ctx);
        if (rc != 0) {
            ESP_LOGW(TAG, "event=ble_scan_restart_failed reason=connect_failed rc=%d", rc);
        }
        return;
    }

    mgr_ctx->conn_handle = conn_handle;
    mgr_ctx->peer_addr = mgr_ctx->pending_connect.addr;
    mgr_ctx->peer_addr_valid = true;
    mgr_ctx->svc_disc_ctx.svc_disc_completed = false;
    mgr_ctx->svc_disc_ctx.chr_disc_completed = false;
    mgr_ctx->svc_disc_ctx.chr_disc_started = false;

    /* After connection, discover all services then drill into required one. */
    int rc = ble_gattc_disc_all_svcs(conn_handle, ble_mgr_gatt_svc_discovered_cb, mgr_ctx);
    if (rc != 0) {
        ESP_LOGE(TAG, "event=ble_service_discovery_start_failed rc=%d", rc);
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
    // Centralize scan, connect, disconnect, and notify handling here so NimBLE GAP policy lives in one place.
    ble_mgr_ctx_t *mgr_ctx = (ble_mgr_ctx_t *)arg;
    if (mgr_ctx == NULL || mgr_ctx->disc_cfg == NULL || mgr_ctx->disc_cfg->svc_def == NULL) {
        return 0;
    }

    switch (event->type) {
        case BLE_GAP_EVENT_DISC: {
            if (mgr_ctx->is_connecting || mgr_ctx->is_connected) {
                break;
            }

            mgr_ctx->scan_diag.adv_seen++;
            // Decode the advertisement first so both built-in service matching and profile-specific filters see the same fields.
            /* Parse advertisement payload and allow profile-specific filtering. */
            struct ble_hs_adv_fields adv_fields;
            int rc = ble_hs_adv_parse_fields(&adv_fields, event->disc.data, event->disc.length_data);
            if (rc != 0) {
                mgr_ctx->scan_diag.parse_failures++;
                if (mgr_ctx->scan_diag.parse_failures <= 3U || (mgr_ctx->scan_diag.parse_failures % 20U) == 0U) {
                    ESP_LOGW(TAG,
                             "event=ble_adv_parse_failed count=%lu adv_len=%u rc=%d",
                             (unsigned long)mgr_ctx->scan_diag.parse_failures,
                             (unsigned int)event->disc.length_data,
                             rc);
                }
                break;
            }

            bool service_match =
                ble_mgr_adv_contains_service(&adv_fields, mgr_ctx->disc_cfg->svc_def->service_uuid);
            if (mgr_ctx->scan_diag.adv_seen <= 5U || (mgr_ctx->scan_diag.adv_seen % 25U) == 0U) {
                char addr_str[BLE_ADDR_STR_LEN] = {0};
                char name_buf[32] = {0};
                (void)ble_addr_to_str(&event->disc.addr, addr_str);
                ble_mgr_copy_adv_name(&adv_fields, name_buf, sizeof(name_buf));
                ESP_LOGI(TAG,
                         "event=ble_adv_observed seq=%lu addr=%s rssi=%d name=%s service_match=%d",
                         (unsigned long)mgr_ctx->scan_diag.adv_seen,
                         addr_str,
                         event->disc.rssi,
                         util_string_empty(name_buf) ? "<no-name>" : name_buf,
                         service_match ? 1 : 0);
            }

            // Service UUID is only the first gate; profile-specific code can still reject the candidate afterwards.
            bool connect = service_match;
            if (mgr_ctx->disc_cfg->dev_filter_cb != NULL) {
                connect = mgr_ctx->disc_cfg->dev_filter_cb(
                    mgr_ctx, &event->disc.addr, &adv_fields, service_match, mgr_ctx->usr_ctx);
            }
            if (!connect) {
                break;
            }

            mgr_ctx->scan_diag.connect_matches++;
            // Queue the candidate first, then stop discovery so the connect path works from a stable target snapshot.
            /* Stop scan before starting connect, matching NimBLE central examples. */
            char addr_str[BLE_ADDR_STR_LEN] = {0};
            (void)ble_addr_to_str(&event->disc.addr, addr_str);
            ESP_LOGI(TAG,
                     "event=ble_candidate_selected addr=%s rssi=%d service_match=%d action=stop_scan",
                     addr_str,
                     event->disc.rssi,
                     service_match ? 1 : 0);
            mgr_ctx->is_connecting = true;
            mgr_ctx->pending_connect.addr = event->disc.addr;
            mgr_ctx->pending_connect.rssi = event->disc.rssi;
            mgr_ctx->pending_connect.service_match = service_match;
            mgr_ctx->pending_connect.armed = true;
            rc = ble_gap_disc_cancel();
            if (rc != 0 && rc != BLE_HS_EALREADY) {
                ESP_LOGW(TAG, "event=ble_scan_cancel_failed rc=%d", rc);
                mgr_ctx->pending_connect.armed = false;
                mgr_ctx->is_connecting = false;
                ble_mgr_connect_complete(mgr_ctx, BLE_MGR_E_NOT_CONNECTED);
                break;
            }
            if (ble_mgr_start_pending_connect(mgr_ctx) != BLE_MGR_E_OK) {
                ble_mgr_connect_complete(mgr_ctx, BLE_MGR_E_NOT_CONNECTED);
            }
            break;
        }

        case BLE_GAP_EVENT_DISC_COMPLETE:
            // When nothing is connected yet, discovery is intentionally self-restarting so the manager keeps hunting.
            /* Keep discovery alive when nothing is connecting/connected. */
            if (!mgr_ctx->is_connecting && !mgr_ctx->is_connected) {
                ESP_LOGI(TAG,
                         "event=ble_scan_cycle_complete adv_seen=%lu parse_failures=%lu connect_matches=%lu",
                         (unsigned long)mgr_ctx->scan_diag.adv_seen,
                         (unsigned long)mgr_ctx->scan_diag.parse_failures,
                         (unsigned long)mgr_ctx->scan_diag.connect_matches);
                int rc = ble_gap_disc(0, BLE_DISCOVERY_TIMEOUT_MS, &s_disc_params, ble_mgr_gap_event_cb, mgr_ctx);
                if (rc != 0) {
                    ESP_LOGW(TAG, "event=ble_scan_restart_failed reason=cycle_complete rc=%d", rc);
                }
            }
            break;

        case BLE_GAP_EVENT_CONNECT:
            ble_mgr_gap_connected_cb(mgr_ctx, event->connect.conn_handle, event->connect.status);
            break;

        case BLE_GAP_EVENT_DISCONNECT:
            // Disconnect clears the active link state first; the profile callback then decides whether scanning should resume.
            /* Clear connection state and optionally restart discovery by policy. */
            mgr_ctx->conn_handle = BLE_HS_CONN_HANDLE_NONE;
            mgr_ctx->is_connected = false;
            mgr_ctx->is_connecting = false;
            mgr_ctx->pending_connect.armed = false;
            if (mgr_ctx->disc_cfg->disconnected_cb != NULL &&
                mgr_ctx->disc_cfg->disconnected_cb(mgr_ctx, mgr_ctx->usr_ctx)) {
                int rc = ble_gap_disc(0, BLE_DISCOVERY_TIMEOUT_MS, &s_disc_params, ble_mgr_gap_event_cb, mgr_ctx);
                if (rc != 0) {
                    ESP_LOGW(TAG, "event=ble_scan_restart_failed reason=disconnect rc=%d", rc);
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
 * Creates the BLE manager context with result queue and lock.
 * Waits for NimBLE host stack to synchronize before returning.
 *
 * @param timeout_ms Maximum time to wait for sync.
 * @return Manager context pointer on success, NULL on timeout/failure.
 */
ble_mgr_ctx_t *ble_mgr_init(uint32_t timeout_ms) {
    ble_mgr_ctx_t *mgr_ctx = &s_mgr;

    if ((mgr_ctx->lock_mtx != NULL || mgr_ctx->result_queue != NULL) && !ble_stack_is_started()) {
        // Recover from partial deinit so the singleton manager can be reinitialized without carrying stale handles.
        ESP_LOGW(TAG, "event=ble_manager_context_reset reason=stale_after_stack_deinit");
        ble_mgr_reset_context(mgr_ctx);
    }

    if (mgr_ctx->lock_mtx != NULL) {
        // Existing mutex implies the singleton manager is already ready for reuse.
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
        // Tear everything back down if the stack never reached the async sync phase.
        ESP_LOGE(TAG, "event=ble_stack_init_failed err=%s", esp_err_to_name(err));
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
        // A sync timeout means NimBLE never announced readiness, so deinit and reset the singleton before returning NULL.
        ESP_LOGE(TAG, "event=ble_stack_sync_timeout");
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

    // Release the API mutex only after the stack sync handshake completes so later callers see a fully usable manager.
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
    memset(&mgr_ctx->pending_connect, 0, sizeof(mgr_ctx->pending_connect));
    memset(&mgr_ctx->scan_diag, 0, sizeof(mgr_ctx->scan_diag));

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
        (void)ble_gap_disc_cancel();
        (void)ble_gap_conn_cancel();
        mgr_ctx->pending_connect.armed = false;
        mgr_ctx->is_connecting = false;
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
    // Push mgr send through the shared publish path so metadata and error handling stay aligned.
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
/**
 * @brief Check BLE manager connection state.
 *
 * @param mgr_ctx BLE manager context.
 * @return True if connected.
 */
bool ble_mgr_is_connected(ble_mgr_ctx_t *mgr_ctx) {
    return mgr_ctx != NULL && mgr_ctx->is_connected;
}

bool ble_mgr_get_peer_address(ble_mgr_ctx_t *mgr_ctx, ble_addr_t *out_addr) {
    if (mgr_ctx == NULL || out_addr == NULL || !mgr_ctx->peer_addr_valid) {
        return false;
    }

    *out_addr = mgr_ctx->peer_addr;
    return true;
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

    if (!mgr_ctx->is_connected && mgr_ctx->conn_handle == BLE_HS_CONN_HANDLE_NONE) {
        return ESP_OK;
    }

    uint16_t conn_handle = mgr_ctx->conn_handle;
    if (conn_handle == BLE_HS_CONN_HANDLE_NONE) {
        mgr_ctx->is_connected = false;
        mgr_ctx->is_connecting = false;
        return ESP_OK;
    }

    int rc = ble_gap_terminate(conn_handle, BLE_ERR_REM_USER_CONN_TERM);
    if (rc != 0 && rc != BLE_HS_EALREADY) {
        return ESP_FAIL;
    }

    uint64_t start_ms = util_uptime_ms();
    while (mgr_ctx->conn_handle != BLE_HS_CONN_HANDLE_NONE || mgr_ctx->is_connected || mgr_ctx->is_connecting) {
        if ((util_uptime_ms() - start_ms) >= BLE_DISCONNECT_WAIT_MS) {
            ESP_LOGW(TAG,
                     "event=ble_disconnect_wait_timeout handle=%u connected=%d connecting=%d",
                     (unsigned)mgr_ctx->conn_handle,
                     mgr_ctx->is_connected ? 1 : 0,
                     mgr_ctx->is_connecting ? 1 : 0);
            break;
        }
        vTaskDelay(pdMS_TO_TICKS(BLE_DISCONNECT_POLL_MS));
    }

    return ESP_OK;
}
