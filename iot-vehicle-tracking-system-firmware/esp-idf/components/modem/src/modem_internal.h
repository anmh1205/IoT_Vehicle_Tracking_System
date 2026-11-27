#pragma once
#include "modem/modem.h"
#include "esp_err.h"
#include <stddef.h>
#include <stdint.h>
#include <string.h>
#include <stdbool.h>
#include "ivts_core/base/err.h"
#include "ivts_core/model/gnss.h"

#define MODEM_TAG "modem"

/* Configuration and topics are initialized before starting the modem task. */
const modem_cfg_t *modem_config(void);
const char *modem_topic_name(modem_topic_t topic);
const char *modem_command_topic(void);
uint64_t modem_now(void);
void modem_emit(const ivts_event_t *event);
void modem_emit_link(uint8_t link, int32_t error);
void modem_set_stopped(bool stopped);

typedef enum {
    REQ_LINK = 0,     /**< Bật/tắt liên kết (on). */
    REQ_GNSS,         /**< Bật/tắt GNSS (on). */
    REQ_PUB_KICK,     /**< Đánh thức vòng lặp khi ô publish có bản tin mới. */
    REQ_HTTP_OPEN,    /**< Mở URL HTTP. */
    REQ_HTTP_READ,    /**< Đọc nội dung HTTP. */
    REQ_HTTP_CLOSE    /**< Đóng phiên HTTP. */
} modem_req_op_t;

/**
 * @brief Request copied by value into the modem work queue.
 *
 * HTTP requests borrow caller-owned input and output buffers. The submitting
 * task waits for completion before returning and releasing that storage.
 * Notifications sent through component sinks carry values with no borrowed
 * buffers because their receivers run independently.
 */
struct modem_rpc;

typedef struct {
    uint8_t           op;       /**< modem_req_op_t. */
    bool              on;       /**< Tham số của REQ_LINK và REQ_GNSS. */
    const char       *url;      /**< REQ_HTTP_OPEN: URL, do caller sở hữu. */
    uint8_t          *buf;      /**< REQ_HTTP_READ: nơi nhận dữ liệu. */
    size_t            len;      /**< REQ_HTTP_READ: dung lượng của buf. */
    uint32_t          offset;   /**< REQ_HTTP_READ: vị trí đọc trong nội dung. */
    size_t           *got;      /**< REQ_HTTP_READ: số byte đọc được. */
    uint32_t         *size;     /**< REQ_HTTP_OPEN: kích thước nội dung. */
    int              *status;   /**< REQ_HTTP_OPEN: mã trạng thái HTTP. */
    struct modem_rpc *reply;    /**< Completion state owned by the waiting task. */
} modem_req_t;

/* Initialize I/O and create the only consumer of the request queue. */
esp_err_t modem_task_start(const modem_cfg_t *cfg);
/* Copy a request into the task queue. HTTP callers may wait for space. */
ivts_err_t modem_task_post(const modem_req_t *request, uint32_t timeout_ms);

/** @brief Submit an HTTP request and block until the modem releases its buffers. */
ivts_err_t modem_task_call(modem_req_t *request);

/* One mutex protects publication and command FIFO copies. */
bool modem_slots_init(void);

/* Modem task takes the publish slot and releases it after broker confirmation or an error. */
bool modem_tx_take(modem_topic_t *topic, const char **payload, size_t *len, uint32_t *tx_id);
void modem_tx_done(bool ok, int16_t error);

/* Modem task. Store a validated command then signal the app queue. */
void modem_cmd_store(const char *payload, size_t len);

/* Copy the available prefix and return its size. Caller decides whether truncation is allowed. */
static inline size_t append_bounded(void *destination, size_t capacity, size_t *used,
                             const uint8_t *data, size_t len)
{
    size_t room = capacity - *used;
    size_t copied = len < room ? len : room;
    memcpy((uint8_t *)destination + *used, data, copied);
    *used += copied;
    return copied;
}

typedef enum {
    MODEM_LINK_STEP_OFF = 0,     /**< Module tắt nguồn. */
    MODEM_LINK_STEP_POWER,       /**< Đang bật nguồn bằng PWRKEY. */
    MODEM_LINK_STEP_SYNC,        /**< Đồng bộ lệnh AT với module. */
    MODEM_LINK_STEP_SIM,         /**< Kiểm tra SIM. */
    MODEM_LINK_STEP_REG,         /**< Chờ đăng ký mạng LTE. */
    MODEM_LINK_STEP_PDP,         /**< Mở kết nối dữ liệu. */
    MODEM_LINK_STEP_MQTT_START,  /**< Khởi động dịch vụ MQTT. */
    MODEM_LINK_STEP_MQTT_ACQ,    /**< Tạo MQTT client. */
    MODEM_LINK_STEP_MQTT_CONN,   /**< Kết nối broker. */
    MODEM_LINK_STEP_MQTT_SUB,    /**< Subscribe topic command. */
    MODEM_LINK_STEP_UP           /**< Sẵn sàng gửi nhận. */
} modem_link_step_t;

/** Trạng thái máy trạng thái kết nối LTE/MQTT. */
typedef struct {
    modem_link_step_t step;           /**< Bước hiện tại. */
    uint32_t    attempt;      /**< Số lần thất bại liên tiếp của bước hiện tại. */
    uint32_t    fails_total;  /**< Tổng số thất bại từ lần bật nguồn; vượt ngưỡng thì power-cycle. */
    uint64_t    retry_at_ms;     /**< Thời điểm (ms, theo modem_now()) được phép thử lại. */
    uint64_t    entered_at_ms;     /**< Thời điểm (ms) vào bước hiện tại. */
} modem_link_t;

/* Modem task. Run the link state machine and publish link transitions. */
void modem_link_tick(void);
modem_link_step_t modem_link_current_step(void);
void modem_link_init(void);
void modem_link_reset(modem_link_step_t step);
void modem_link_on_connection_lost(void);
void modem_link_power_down(void);

typedef enum {
    MODEM_LINK_IDLE, MODEM_LINK_ADVANCE, MODEM_LINK_FAIL, MODEM_LINK_RETRY_LATER, MODEM_LINK_RESTART, MODEM_LINK_BROKER_UP,
} step_action_t;

typedef struct {
    step_action_t action;
    modem_link_step_t target;
    uint32_t delay_ms;
} step_result_t;

step_result_t modem_link_run_step(const modem_link_t *link);

/* Modem task. Reconcile requested GNSS power and publish fixes when due. */
void modem_gnss_init(void);
void modem_gnss_request(bool enabled);
void modem_gnss_reset_power(void);
void modem_gnss_step(void);

/**
 * @file gnss_parse.h
 * @brief Phân tích kết quả GNSS của SIM7600 thành ivts_gnss_t bằng số nguyên (không dùng float).
 *
 * Module thuần C, không có trạng thái toàn cục nên gọi được từ mọi task và kiểm thử được trên host.
 *
 * Định dạng theo SIM7500_SIM7600 Series AT Command Manual V2.00, mục 17.2.2 và 17.2.21:
 *
 *     +CGNSSINFO: <mode>,<GPS-SVs>,<GLONASS-SVs>,<BEIDOU-SVs>,<lat>,<N/S>,<log>,<E/W>,<date>,
 *                 <UTC-time>,<alt>,<speed>,<course>,<PDOP>,<HDOP>,<VDOP>   -> IVTS_GNSS_SRC_FULL
 *     +CGPSINFO:  <lat>,<N/S>,<log>,<E/W>,<date>,<UTC time>,<alt>,<speed>,<course>
 *                                                                          -> IVTS_GNSS_SRC_APPROX
 *
 * Đơn vị: lat dạng ddmm.mmmmmm, log dạng dddmm.mmmmmm, date dạng ddmmyy, time dạng hhmmss.s,
 * speed tính bằng knot. Khi chưa có fix (ví dụ "+CGNSSINFO: ,,,,") hàm trả IVTS_OK với
 * fix_valid = false.
 */

/** Phân tích một dòng +CGNSSINFO (đầy đủ). @return IVTS_OK, hoặc lỗi nếu dòng sai định dạng. */
ivts_err_t gnss_parse_cgnssinfo(const char *line, ivts_gnss_t *out);

/** Phân tích một dòng +CGPSINFO (rút gọn). @return IVTS_OK, hoặc lỗi nếu dòng sai định dạng. */
ivts_err_t gnss_parse_cgpsinfo(const char *line, ivts_gnss_t *out);

/**
 * @brief Đổi toạ độ NMEA sang độ nhân 1e7, có dấu theo bán cầu.
 *
 * Ví dụ "3113.330650" với 'N' cho 312221775. Hemisphere 'S' và 'W' cho giá trị âm.
 *
 * @param hemi 'N', 'S', 'E' hoặc 'W'; 'N'/'S' kiểm tra giới hạn vĩ độ, 'E'/'W' kiểm tra kinh độ.
 * @retval IVTS_OK              Đã chuyển đổi.
 * @retval IVTS_ERR_INVALID_ARG Tham số NULL, chuỗi sai định dạng, phút >= 60, bán cầu không hợp lệ
 *                              hoặc vượt giới hạn.
 */
ivts_err_t gnss_nmea_to_e7(const char *ddmm, char hemi, int32_t *out);

/** Đổi ngày ddmmyy và giờ hhmmss(.s) UTC sang Unix epoch tính bằng ms. */
ivts_err_t gnss_datetime_to_unix_ms(const char *ddmmyy, const char *hhmmss, uint64_t *out);

/** @brief Execute an HTTP operation on the modem task and return its result. */
ivts_err_t modem_http_handle(const modem_req_t *request);
bool modem_http_on_line(const char *line);
bool modem_http_route_raw(const uint8_t *data, size_t len, bool is_last);
void modem_http_discard_raw(void);
