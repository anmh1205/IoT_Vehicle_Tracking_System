#pragma once

/**
 * @file app_priv.h
 * @brief Khai báo nội bộ của component app: trạng thái g_app và các hàm giữa các file.
 */

#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/event/event.h"
#include "ivts_core/fsm/axes.h"
#include "ivts_core/fsm/fsm.h"
#include "ivts_core/model/config.h"
#include "ivts_core/model/record.h"
#include "ivts_core/model/telemetry.h"
#include "ivts_core/ota/confirm.h"
#include "ivts_core/ota/contract.h"

#define APP_TAG "app"

/** Loại bản tin đang publish. PUB_NONE là giá trị "không có bản tin nào bay". */
typedef enum {
    PUB_NONE = 0,
    PUB_RAW_LIVE,     /**< Mẫu telemetry thời gian thực. */
    PUB_RAW_REPLAY,   /**< Bản ghi lấy từ offline queue. */
    PUB_LOCATION,     /**< Vị trí gửi theo yêu cầu từ cloud. */
    PUB_STATUS,       /**< Trạng thái thiết bị định kỳ. */
    PUB_BOUNDARY,     /**< Mốc mở/đóng phiên đã lưu NVS. */
    PUB_EVENT,        /**< Sự kiện đơn lẻ (ví dụ config_corrupt). */
    PUB_ALARM,        /**< Cảnh báo chuyển động lưu NVS. */
    PUB_FW,           /**< Trạng thái firmware/OTA. */
    PUB_CMD_ACK,      /**< Phản hồi một command từ cloud. */
} pub_kind_t;

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
    uint8_t        link;            /**< Trạng thái liên kết hiện tại (ivts_link_t). */
    bool           provisioned;
    bool           tracking_enabled;
    ivts_session_state_t session;

    /* Publish: tại một thời điểm chỉ có một bản tin bay, khớp với ô publish duy nhất của modem. */
    bool           pub_inflight;    /**< Có bản tin đang chờ ACK. */
    pub_kind_t     pub_kind;        /**< Loại bản tin đang bay. */
    uint32_t       pub_tx;          /**< Mã giao dịch của bản tin đang bay, dùng đối chiếu ACK. */
    ivts_record_t  pub_rec;         /**< Bản ghi đang bay; đẩy vào offline queue nếu ACK lỗi. */
    uint32_t       replay_token;    /**< Token của bản ghi replay đang bay. */
    uint32_t       popped_token;    /**< Token đã yêu cầu pop, chờ storage xử lý xong. */
    bool           replay_requested;/**< Đã gửi yêu cầu peek lên storage, chờ kết quả. */
    bool           ota_health_acked; /**< Broker đã ACK bản tin trạng thái trong lần boot này. */
    bool           status_dirty;

    /* OTA */
    bool               ota_confirm_pending; /**< Image mới đang chờ xác nhận hợp lệ. */
    bool               ota_job_active;
    bool               ota_report_pending;  /**< Giữ ngữ cảnh NVS đến PUBACK của báo cáo cuối. */
    uint64_t           ota_reboot_ms;
    ivts_ota_pending_t ota_pending;         /**< Thông tin OTA đang chờ, lưu trong NVS. */
    ivts_fw_status_t   fw;                  /**< Trạng thái firmware báo lên cloud. */
    bool               fw_dirty;            /**< fw đã đổi, cần publish PUB_FW. */

    /* Sự kiện chờ publish (ví dụ config hỏng). */
    char           event_code[32];  /**< Mã sự kiện gửi lên cloud. */
    bool           event_dirty;     /**< event_code chưa được publish. */
    ivts_motion_alarm_t alarm;
    bool           alarm_persisted;
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
uint64_t app_now(void);                           /**< Thời gian đơn điệu của app, đơn vị ms. */

/* ---- app_publish.c ---- */
void app_publish(pub_kind_t kind);
void app_publish_on_ack(const ivts_event_t *ev);
void app_publish_poll(void);
void app_publish_on_queue_ready(void);
void app_publish_replay_tick(void);
bool app_publish_ack_cmd(const char *command_id, const char *status, const char *response);
bool app_publish_location(void);
void app_publish_control_tick(void);
void app_publish_latch_alarm(void);

/* ---- app_cmd.c ---- */
void app_cmd_init(void);
void app_cmd_handle(void);
void app_cmd_tick(void);
void app_cmd_on_ack(bool ok);
void app_cmd_on_location_ack(bool ok);
bool app_cmd_pending(void);
bool app_cmd_blocks_sleep(void);
bool app_cmd_needs_gnss(void);

/* ---- app_session.c ---- */
void app_session_tick(void);
bool app_session_on_ack(void);
bool app_session_assign(uint32_t local_key, const char *boot_id, uint64_t canonical_id);

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
