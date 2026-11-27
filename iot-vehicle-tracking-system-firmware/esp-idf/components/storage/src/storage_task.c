/**
 * @file src/storage_task.c
 * @brief Storage startup and single-task serialization of SD requests.
 *
 * App wiring initializes NVS and recovers SD state before creating the only SD request consumer.
 * Producers submit copied requests with zero wait. The worker reports failures and announces a newly filled
 * peek slot.
 * Stale pop tokens are ignored. Requests live in RAM, and startup recovers from segment files and the saved
 * cursor.
 * NVS operations run synchronously on their callers.
 */
#include "storage_internal.h"
#include "queue/queue.h"
#include "sd/sd.h"
#include <stdatomic.h>
#include <string.h>
#include "esp_check.h"
#include "platform/log.h"
#include "platform/platform.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"
#include "ivts_core/model/record.h"

/** @brief Operation identifier carried by a storage request. */
typedef enum {
    REQ_LOG = 0,   /**< Append one SD log line. */
    REQ_Q_PUSH,    /**< Append a record to the offline queue. */
    REQ_Q_PEEK,    /**< Fill the peek slot from the oldest available record. */
    REQ_Q_POP      /**< Remove the record associated with the supplied peek token. */
} req_op_t;

/** @brief Work item copied into the queue and then owned by the storage task. */
typedef struct {
    uint8_t  op;                            /**< Request operation encoded as a req_op_t value. */
    uint16_t len;                           /**< Number of valid bytes in data. */
    uint32_t token;                         /**< Token identifying the record requested by REQ_Q_POP. */
    uint8_t  data[STORAGE_LOG_LINE_MAX];    /**< Copied log line or encoded offline record. */
} storage_req_t;

_Static_assert(IVTS_RECORD_MAX_SIZE <= STORAGE_LOG_LINE_MAX, "bản ghi phải vừa ô data của yêu cầu");

static QueueHandle_t s_request_queue;   /* Startup publishes the handle for producers and the sole consumer. */
/* Producers reserve a count before enqueue. The worker releases it after the append attempt. */
static atomic_uint s_pending_pushes;

/** @brief Copy one request to the SD worker queue without waiting for capacity. */
static ivts_err_t post(const storage_req_t *r)
{
    if (s_request_queue == NULL) { return IVTS_ERR_INVALID_STATE; }
    return (xQueueSend(s_request_queue, r, 0) == pdTRUE) ? IVTS_OK : IVTS_ERR_FULL;
}

ivts_err_t storage_log_append(const char *line)
{
    if (line == NULL) { return IVTS_ERR_INVALID_ARG; }
    if (!storage_sd_ok()) { return IVTS_ERR_INVALID_STATE; }
    storage_req_t r = { .op = REQ_LOG };
    size_t n = strnlen(line, STORAGE_LOG_LINE_MAX);
    memcpy(r.data, line, n);                 /* Truncate an oversized log line to fit its request buffer. */
    r.len = (uint16_t)n;
    return post(&r);
}

ivts_err_t storage_queue_push(const uint8_t *rec, size_t len)
{
    if (rec == NULL || len == 0u || len > IVTS_RECORD_MAX_SIZE) { return IVTS_ERR_INVALID_ARG; }
    if (!storage_sd_ok()) { return IVTS_ERR_INVALID_STATE; }
    storage_req_t r = { .op = REQ_Q_PUSH, .len = (uint16_t)len };
    memcpy(r.data, rec, len);
    atomic_fetch_add(&s_pending_pushes, 1u);
    ivts_err_t e = post(&r);
    if (e != IVTS_OK) { atomic_fetch_sub(&s_pending_pushes, 1u); }
    return e;
}

bool storage_queue_has_unflushed_push(void) { return atomic_load(&s_pending_pushes) != 0u; }

ivts_err_t storage_queue_request_peek(void)
{
    if (!storage_sd_ok()) { return IVTS_ERR_INVALID_STATE; }
    storage_req_t r = { .op = REQ_Q_PEEK };
    return post(&r);
}

ivts_err_t storage_queue_pop(uint32_t token)
{
    storage_req_t r = { .op = REQ_Q_POP, .token = token };
    return post(&r);
}

/** @brief Report an SD work failure asynchronously through the configured sink. */
static void report(uint8_t op, ivts_err_t e)
{
    if (e == IVTS_OK) { return; }
    ivts_event_t ev = { .type = IVTS_EV_STORE_RESULT, .ts_ms = platform_uptime_ms() };
    ev.u.store_result.op = op;
    ev.u.store_result.err = (int32_t)e;
    storage_emit(&ev);
}

/** @brief Serialize SD requests and keep append tracking active through result delivery. */
static void storage_task(void *arg)
{
    (void)arg;
    storage_req_t r;
    for (;;) {
        if (xQueueReceive(s_request_queue, &r, portMAX_DELAY) != pdTRUE) { continue; }
        switch (r.op) {
        case REQ_LOG:    report(IVTS_STORE_OP_LOG_APPEND, storage_sd_log_write((const char *)r.data, r.len)); break;
        case REQ_Q_PUSH:
            report(IVTS_STORE_OP_QUEUE_PUSH, storage_queue_do_push(r.data, r.len));
            atomic_fetch_sub(&s_pending_pushes, 1u);
            break;
        case REQ_Q_PEEK: report(IVTS_STORE_OP_QUEUE_PEEK, storage_queue_do_peek()); break;
        case REQ_Q_POP: {
            ivts_err_t e = storage_queue_do_pop(r.token);
            if (e != IVTS_ERR_NOT_FOUND) { report(IVTS_STORE_OP_QUEUE_POP, e); }
            break;
        }
        default: break;
        }
    }
}

esp_err_t storage_task_start(void)
{
    s_request_queue = xQueueCreate(storage_config_view()->req_queue_len, sizeof(storage_req_t));
    ESP_RETURN_ON_FALSE(s_request_queue != NULL, ESP_ERR_NO_MEM, STORAGE_TAG, "queue");
    BaseType_t ok = xTaskCreate(storage_task, "storage", storage_config_view()->task_stack, NULL,
                                storage_config_view()->task_prio, NULL);
    ESP_RETURN_ON_FALSE(ok == pdPASS, ESP_ERR_NO_MEM, STORAGE_TAG, "task");
    return ESP_OK;
}

/* Startup publishes the copied settings and SD readiness before the worker starts. */

static storage_cfg_t s_storage_cfg;
static bool s_sd_ok;   /* Set during storage_init() after the card and offline queue are ready. */

const storage_cfg_t *storage_config_view(void) { return &s_storage_cfg; }

void storage_emit(const ivts_event_t *ev)
{
    (void)ivts_sink_emit(&s_storage_cfg.sink, ev);
}

bool storage_sd_ok(void) { return s_sd_ok; }

ivts_err_t storage_init(const storage_cfg_t *cfg)
{
    if (cfg == NULL || cfg->sink.fn == NULL) { return IVTS_ERR_INVALID_ARG; }
    s_storage_cfg = *cfg;

    esp_err_t e = storage_nvs_init();
    if (e != ESP_OK) {
        IVTS_LOGE(STORAGE_TAG, "nvs init result=fail err=%s", esp_err_to_name(e));
        return platform_err_from_esp(e);
    }
    storage_queue_slot_init();
    if (cfg->sd_enabled) {
        e = storage_sd_mount();
        s_sd_ok = (e == ESP_OK);
        if (s_sd_ok) {
            s_sd_ok = (storage_queue_open() == ESP_OK);
        }
        if (!s_sd_ok) {
            ivts_event_t ev = { .type = IVTS_EV_STORE_RESULT, .ts_ms = platform_uptime_ms() };
            ev.u.store_result.op = IVTS_STORE_OP_SD_MOUNT;
            ev.u.store_result.err = (int32_t)IVTS_ERR_IO;
            storage_emit(&ev);
        }
    }
    e = storage_task_start();
    IVTS_LOGI(STORAGE_TAG, "init nvs=ok sd=%s queue=%lu", cfg->sd_enabled ? IVTS_LOG_OK(s_sd_ok) : "off",
              (unsigned long)storage_queue_count());
    return platform_err_from_esp(e);
}
