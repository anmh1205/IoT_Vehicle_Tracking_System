#pragma once

/**
 * @file app_priv.h
 * @brief Khai báo nội bộ của component app: trạng thái g_app và các hàm giữa các file.
 */

#include <stdbool.h>
#include <stdint.h>
#include "app_clock.h"
#include "ivts_core/event/event.h"
#include "ivts_core/fsm/axes.h"
#include "ivts_core/fsm/fsm.h"
#include "ivts_core/model/config.h"
#include "ivts_core/model/record.h"
#include "ivts_core/model/telemetry.h"
#include "ivts_core/ota/confirm.h"
#include "ivts_core/ota/contract.h"

#define APP_TAG "app"

/**
 * Toàn bộ trạng thái của app.
 *
 * Chỉ task "app" đọc và ghi g_app sau khi app_init_all() trả về, nên không cần khoá.
 * app_init_all() ghi g_app trước khi task "app" được tạo.
 */
typedef struct {
    ivts_config_t  cfg;
    ivts_fsm_cfg_t fsm_cfg;
    ivts_axes_cfg_t axes_cfg;
    ivts_fsm_t     fsm;
    ivts_axes_t    axes;
    uint32_t       boot_id;
    bool           provisioned;
    bool           tracking_enabled;
} app_t;

extern app_t g_app;

/* ---- app_os.c: queue sự kiện và task "app" ---- */

/** Tạo queue sự kiện. @return false nếu hết bộ nhớ. */
bool app_os_init(void);
/** Tạo task "app" chạy @p fn. @return false nếu không tạo được task. */
bool app_os_start_task(void (*fn)(void *));
/** Sink dùng chung cho mọi component; đẩy sự kiện vào queue của app, không bao giờ chặn. */
ivts_sink_t app_sink(void);
/** Nhận một sự kiện từ queue, chờ tối đa @p timeout_ms. Chỉ task "app" được gọi. */
bool app_os_receive(ivts_event_t *ev, uint32_t timeout_ms);
/** Tổng số sự kiện đã bị bỏ do queue đầy kể từ khi boot. Gọi được từ mọi task. */
uint32_t app_os_drops(void);

/* ---- app_init.c ---- */

/** Khởi tạo mọi component. @return false nếu gặp lỗi bắt buộc (caller phải restart). */
bool app_init_all(void);
/** Tính lại axes_cfg và fsm_cfg từ g_app.cfg và khả năng phần cứng. */
void app_apply_config(void);

/* ---- app_state.c: snapshot telemetry; task "app" là writer duy nhất ---- */

void app_state_on_event(const ivts_event_t *ev);
const ivts_telemetry_t *app_state_get(void);
void app_state_set_device(ivts_device_state_t d, ivts_sleep_mode_t m);
void app_state_make_record(ivts_record_t *r);     /**< Chụp mẫu telemetry hiện tại và cấp seq mới. */
void app_dispatch(const ivts_event_t *ev);

/* ---- app_sleep.c ---- */
void app_sleep_enter(const ivts_fsm_out_t *out);

/* ---- app_diag.c ---- */

/** Ghi log stack high-water-mark của các task nếu bật CONFIG_IVTS_DIAG_STACK_LOG. */
void app_diag_tick(uint64_t now_ms);

/* ---- app_rtc_ctx.c: dữ liệu giữ qua deep sleep, mất khi mất nguồn ---- */
bool app_rtc_ctx_load(uint32_t *boot_id, uint32_t *seq);
void app_rtc_ctx_save(uint32_t boot_id, uint32_t seq, uint8_t last_state);
uint32_t app_rtc_next_seq(void);
uint32_t app_rtc_current_seq(void);
