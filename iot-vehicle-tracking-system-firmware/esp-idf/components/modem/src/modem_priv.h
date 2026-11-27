#pragma once

/**
 * @file modem_priv.h
 * @brief Khai báo nội bộ của component modem: trạng thái g_modem và hàm giữa các file.
 *
 * Mọi trường của g_modem chỉ được truy cập trong task "modem", trừ hai ô publish và command
 * (nằm trong modem.c, bảo vệ bằng mutex) và các hàm công khai trong modem.h.
 */

#include <stdbool.h>
#include <stdint.h>
#include "esp_err.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/semphr.h"
#include "modem/modem.h"
#include "at_engine.h"
#include "at_parser.h"

#define MODEM_TAG "modem"

/** Các bước đưa module từ tắt nguồn đến khi kết nối broker; xem modem_lte.c. */
typedef enum {
    L_OFF = 0,     /**< Module tắt nguồn. */
    L_POWER,       /**< Đang bật nguồn bằng PWRKEY. */
    L_SYNC,        /**< Đồng bộ lệnh AT với module. */
    L_SIM,         /**< Kiểm tra SIM. */
    L_REG,         /**< Chờ đăng ký mạng LTE. */
    L_PDP,         /**< Mở kết nối dữ liệu. */
    L_MQTT_START,  /**< Khởi động dịch vụ MQTT. */
    L_MQTT_ACQ,    /**< Tạo MQTT client. */
    L_MQTT_CONN,   /**< Kết nối broker. */
    L_MQTT_SUB,    /**< Subscribe topic command. */
    L_UP           /**< Sẵn sàng gửi nhận. */
} lte_state_t;

/** Trạng thái máy trạng thái kết nối LTE/MQTT. */
typedef struct {
    lte_state_t st;           /**< Bước hiện tại. */
    uint32_t    attempt;      /**< Số lần thất bại liên tiếp của bước hiện tại. */
    uint32_t    fails_total;  /**< Tổng số thất bại từ lần bật nguồn; vượt ngưỡng thì power-cycle. */
    uint64_t    retry_at;     /**< Thời điểm (ms, theo modem_now()) được phép thử lại. */
    uint64_t    st_since;     /**< Thời điểm (ms) vào bước hiện tại. */
} modem_lte_t;

/** Loại yêu cầu gửi tới task "modem". */
typedef enum {
    REQ_LINK = 0,     /**< Bật/tắt liên kết (on). */
    REQ_GNSS,         /**< Bật/tắt GNSS (on). */
    REQ_PUB_KICK,     /**< Đánh thức vòng lặp khi ô publish có bản tin mới. */
    REQ_HTTP_OPEN,    /**< Mở URL HTTP. */
    REQ_HTTP_READ,    /**< Đọc nội dung HTTP. */
    REQ_HTTP_CLOSE    /**< Đóng phiên HTTP. */
} modem_req_op_t;

/**
 * Yêu cầu từ task khác tới task "modem", sao chép theo giá trị vào g_modem_q.
 *
 * Các yêu cầu HTTP mang con trỏ tới buffer và biến kết quả của caller. Việc này an toàn vì
 * caller chặn trên @c done cho đến khi task "modem" ghi kết quả và give semaphore, nên các
 * vùng nhớ đó còn sống trong suốt thời gian task "modem" truy cập. Sự kiện gửi qua sink thì
 * không được mang con trỏ vì người nhận không chặn.
 */
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
    ivts_err_t       *result;   /**< Kết quả của yêu cầu HTTP. */
    SemaphoreHandle_t done;     /**< Semaphore caller chờ; task "modem" give khi xong. */
} modem_req_t;

/** Toàn bộ trạng thái của modem; task "modem" là writer duy nhất (xem phần đầu file). */
typedef struct {
    modem_cfg_t  cfg;            /**< Cấu hình, bất biến sau modem_init(). */
    at_parser_t  parser;         /**< Bộ tách dòng/prompt/dữ liệu thô từ byte UART. */
    at_engine_t  eng;            /**< Bộ thực thi một lệnh AT tại một thời điểm. */
    modem_lte_t  lte;            /**< Máy trạng thái kết nối. */
    char         topic[MODEM_TOPIC_COUNT][48];  /**< Topic publish, dựng một lần ở modem_init(). */
    char         topic_cmd[48];  /**< Topic subscribe nhận command. */
    bool         link_wanted;    /**< Cloud muốn liên kết bật (từ modem_set_link). */
    bool         gnss_wanted;    /**< App muốn GNSS bật (từ modem_set_gnss). */
    bool         gnss_on;        /**< GNSS của module đang bật. */
    uint64_t     gnss_next;      /**< Thời điểm (ms) đọc GNSS lần kế tiếp. */
    uint64_t     power_restart_at; /**< Sớm nhất được thăm dò UART hoặc bật lại module. */
    uint64_t     raw_deadline_ms; /**< Giới hạn chờ phần byte thô sau header. */

    /** Trạng thái nhận một command qua URC +CMQTTRX*. */
    struct {
        bool    active;         /**< Đang nhận một tin. */
        uint8_t phase;          /**< 1 = đang nhận topic, 2 = đang nhận payload. */
        uint8_t pending_header; /**< Header đã nhận, modem gửi phần số ở dòng kế tiếp. */
        size_t  tlen, plen;     /**< Số byte topic và payload đã nhận. */
        size_t  topic_total, payload_total;
        bool    overflow;       /**< Tin dài hơn bộ đệm; phần thừa bị bỏ. */
        char    topic[64];
        char    payload[MODEM_CMD_MAX];
    } rx;

    /* Đích của dữ liệu thô sau +HTTPREAD: DATA. */
    uint8_t *http_dst;           /**< Bộ đệm của caller đang nhận dữ liệu; NULL khi không có yêu cầu đọc. */
    size_t   http_cap, http_len; /**< Dung lượng bộ đệm và số byte đã nhận. */
    bool     http_raw;           /**< Parser đang nhận byte sau header HTTPREAD. */
    bool     http_overflow;      /**< Modem trả nhiều byte hơn buffer của caller. */
} modem_t;

extern modem_t g_modem;
/** Queue yêu cầu của task "modem"; tạo trong modem_os_start(), NULL trước đó. */
extern QueueHandle_t g_modem_q;

uint64_t modem_now(void);                               /**< ms kể từ boot, từ esp_timer. */
void modem_emit_link(uint8_t link, int32_t err);        /**< Báo link qua sink; bỏ qua nếu không đổi. */
void modem_emit(const ivts_event_t *ev);                /**< Gửi sự kiện qua sink, không chờ. */

/* ---- modem_os.c ---- */

/** Khởi tạo UART, GPIO, PM lock, queue và tạo task "modem". */
esp_err_t modem_os_start(void);
/** Chạy một lệnh AT và chặn đến khi xong hoặc hết thời gian. Chỉ gọi trong task "modem". */
at_result_t modem_at(const at_cmd_t *c);
/** Như modem_at() cho lệnh chỉ có văn bản và timeout. */
at_result_t modem_at_simple(const char *text, uint32_t timeout_ms);
bool modem_tls_configure(unsigned index);
void modem_set_stopped(bool stopped);
/** Đọc UART tối đa @p wait_ms, đưa byte qua parser và xử lý URC. Chỉ gọi trong task "modem". */
void modem_pump(uint32_t wait_ms);
void modem_expect_raw(size_t len);
/** Kéo PWRKEY trong @p ms mili giây. */
void modem_power_pulse(uint32_t ms);
/** Yêu cầu tắt nguồn và chặn khởi động lại trong lúc SIM7600 hoàn tất tắt. */
void modem_power_down(void);
/** Giữ hoặc nhả khoá cấm light sleep (cần giữ khi nói chuyện với module). */
void modem_pm_hold(bool hold);

/* ---- modem.c: ô publish và ô command ---- */

/** Task "modem" lấy bản tin trong ô publish để gửi. @return false nếu ô trống hoặc đã lấy rồi. */
bool modem_tx_take(modem_topic_t *topic, const char **payload, size_t *len, uint32_t *tx_id);
/** Báo kết quả gửi: giải phóng ô publish và phát IVTS_EV_MQTT_ACK. */
void modem_tx_done(bool ok, int16_t err);
/** Lưu command nhận được vào ô command và phát IVTS_EV_CMD_PENDING; đếm drop nếu ô đầy. */
void modem_cmd_store(const char *payload, size_t len);

/* ---- modem_lte.c ---- */

/** Chạy một bước của máy trạng thái kết nối. */
void modem_lte_step(void);
/** Đặt máy trạng thái về @p to và xoá bộ đếm lỗi. */
void modem_lte_reset(lte_state_t to);
/** Báo mất kết nối broker: đưa máy trạng thái về bước kết nối lại. */
void modem_lte_conn_lost(void);

/* ---- modem_gnss.c ---- */

/** Bật/tắt GNSS của module theo mong muốn và đọc vị trí theo chu kỳ. */
void modem_gnss_step(void);

/* ---- modem_mqtt.c ---- */

/** Chạy bước MQTT @p st. @return true nếu bước hoàn tất và máy trạng thái sang bước kế. */
bool modem_mqtt_step(lte_state_t st);
/** Gửi bản tin trong ô publish nếu có (khi link đang L_UP). */
void modem_mqtt_publish_pending(void);
/** Xử lý một dòng URC bắt đầu bằng +CMQTT. */
void modem_mqtt_on_urc(const char *line);
/** Ngắt kết nối broker và giải phóng client. */
void modem_mqtt_disconnect(void);

/* ---- modem_http.c ---- */

/** Thực hiện yêu cầu HTTP trong @p r rồi give @c r->done. */
void modem_http_handle(const modem_req_t *r);
/** Xử lý dòng thuộc phiên HTTP. @return true nếu dòng đã được tiêu thụ. */
bool modem_http_on_line(const char *line);
