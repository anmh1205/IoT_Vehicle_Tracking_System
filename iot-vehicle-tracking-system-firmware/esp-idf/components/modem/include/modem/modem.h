#pragma once

/**
 * @file modem.h
 * @brief Giao diện công khai của modem SIM7600: LTE, GNSS, MQTT qua lệnh AT và nguồn byte HTTP cho OTA.
 *
 * Toàn bộ giao tiếp với module chạy trong task "modem". Các hàm điều khiển trong header này
 * không chặn (đưa yêu cầu vào queue của task "modem"), trừ nhóm modem_http_* chặn caller
 * cho đến khi task "modem" trả lời. Kết quả quay về component khác qua sink dưới dạng sự kiện.
 */

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/event/event.h"

#define MODEM_CLIENT_ID_MAX 23u      /**< Độ dài tối đa của MQTT client id (AT+CMQTTACCQ nhận 1..23 byte). */
#define MODEM_CMD_MAX       1024u    /**< Kích thước ô command: payload command lớn nhất nhận được. */
#define MODEM_PAYLOAD_MAX   2048u    /**< Kích thước ô publish: payload lớn nhất gửi được. */

/** Cấu hình modem; modem_init() sao chép toàn bộ nên con trỏ nguồn không cần tồn tại sau đó. */
typedef struct {
    ivts_sink_t sink;                /**< Nơi nhận sự kiện (LINK_STATE, MQTT_ACK, CMD_PENDING, GNSS_FIX). */
    bool     (*time_get)(uint64_t *unix_ms);  /**< Nguồn UTC tùy chọn, gọi từ task modem. */
    int      uart_num;               /**< Số UART nối SIM7600. */
    int      pin_tx, pin_rx;         /**< Chân UART của ESP32-S3. */
    int      pin_pwrkey;             /**< Chân điều khiển PWRKEY. */
    int      pin_reset;              /**< Chân RESET của module, hiện chưa dùng. */
    bool     pwrkey_inverted;        /**< true nếu mạch có transistor đảo: GPIO = 1 nghĩa là kéo PWRKEY xuống. */
    uint32_t baud;                   /**< Tốc độ UART. */
    char     apn[64];                /**< APN của nhà mạng. */
    char     mqtt_host[64];          /**< Địa chỉ broker. */
    uint16_t mqtt_port;              /**< Cổng broker. */
    bool     use_tls;                /**< Client TLS policy, supplied by app wiring. */
    bool     command_subscribe_enabled;
    char     client_id[MODEM_CLIENT_ID_MAX + 1u];  /**< MQTT client id, 1..MODEM_CLIENT_ID_MAX ký tự. */
    char     mqtt_user[32];          /**< Tên đăng nhập MQTT. */
    char     mqtt_pass[64];          /**< Mật khẩu MQTT. */
    char     device_id[32];          /**< Định danh thiết bị, dùng dựng topic v1/<device_id>/... */
    uint16_t gnss_period_s;          /**< Chu kỳ đọc GNSS, giây. */
    uint8_t  task_prio;              /**< Priority của task "modem". */
    uint32_t task_stack;             /**< Stack của task "modem", byte. */
} modem_cfg_t;

/**
 * @brief Khởi tạo UART, GPIO PWRKEY, mutex các ô và tạo task "modem".
 *
 * Modem chưa được bật nguồn sau hàm này; gọi modem_set_link(true) để bật.
 *
 * @retval IVTS_OK              Task đã chạy.
 * @retval IVTS_ERR_INVALID_ARG cfg hoặc sink NULL, hoặc client_id rỗng/dài quá MODEM_CLIENT_ID_MAX.
 * @retval IVTS_ERR_FULL        Topic dài quá bộ đệm, hoặc không tạo được mutex/UART/queue/task.
 */
ivts_err_t modem_init(const modem_cfg_t *cfg);

/**
 * @name Điều khiển
 * Các hàm gửi yêu cầu tới task "modem" và trả về ngay; an toàn gọi từ mọi task.
 * Trả IVTS_ERR_FULL nếu queue yêu cầu đầy, IVTS_ERR_INVALID_STATE nếu modem chưa init.
 * @{
 */

/**
 * @brief Bật hoặc tắt liên kết với broker.
 *
 * on = true: bật nguồn module, đăng ký LTE, mở PDP, kết nối MQTT và subscribe topic command.
 * on = false: ngắt broker rồi tắt nguồn module bằng PWRKEY. Tiến trình báo qua IVTS_EV_LINK_STATE.
 */
ivts_err_t modem_set_link(bool on);
/** @return true khi task modem chưa được bật hoặc đã ngắt link và phát xong xung tắt nguồn. */
bool modem_is_stopped(void);
/** Trạng thái hiện tại kể cả khi sự kiện IVTS_EV_LINK_STATE bị bỏ do queue đầy. */
ivts_link_t modem_link_state(void);

/** @brief Bật hoặc tắt GNSS; kết quả đo về qua IVTS_EV_GNSS_FIX khi module đã có nguồn. */
ivts_err_t modem_set_gnss(bool on);
/** @} */

/** Topic publish. Tên đầy đủ có dạng v1/<device_id>/<tên>. */
typedef enum {
    MODEM_TOPIC_RAWDATA = 0,
    MODEM_TOPIC_STATUS,
    MODEM_TOPIC_EVENTS,
    MODEM_TOPIC_FIRMWARE,
    MODEM_TOPIC_CMD_ACK,
    MODEM_TOPIC_COUNT
} modem_topic_t;

/**
 * @brief Gửi một bản tin QoS 1 lên broker.
 *
 * Tại một thời điểm chỉ có một bản tin trong ô publish. Hàm sao chép payload vào ô nên buffer
 * của caller dùng lại được ngay khi hàm trả về. Kết quả báo qua IVTS_EV_MQTT_ACK{tx_id, ok};
 * khi không có broker, ACK với ok = 0 được phát ngay.
 *
 * @param tx_id Mã giao dịch do caller chọn, trả lại nguyên vẹn trong sự kiện ACK.
 * @retval IVTS_OK              Ô đã nhận bản tin.
 * @retval IVTS_ERR_FULL        Ô đang bận.
 * @retval IVTS_ERR_INVALID_ARG payload NULL, len = 0, len > MODEM_PAYLOAD_MAX hoặc topic không hợp lệ.
 */
ivts_err_t modem_publish(modem_topic_t topic, const char *payload, size_t len, uint32_t tx_id);

/** @return true nếu ô publish đang giữ bản tin chưa có kết quả. */
bool modem_publish_busy(void);
/** Lấy kết quả gần nhất theo tx_id nếu sự kiện MQTT_ACK bị bỏ khi queue app đầy. */
bool modem_publish_result(uint32_t tx_id, bool *ok, int16_t *err);

/**
 * @brief Lấy command từ cloud ra khỏi ô command (sao chép) và giải phóng ô.
 *
 * Gọi sau khi nhận IVTS_EV_CMD_PENDING. Nội dung không kết thúc bằng NUL; độ dài trả qua @p len.
 *
 * @param cap Kích thước @p out. Phải không nhỏ hơn MODEM_CMD_MAX; nếu nhỏ hơn độ dài command thì
 *            hàm trả IVTS_ERR_FULL và command vẫn đứng đầu hàng đợi.
 * @retval IVTS_OK        Đã lấy command.
 * @retval IVTS_ERR_NOT_FOUND Hàng đợi trống.
 * @retval IVTS_ERR_FULL  @p cap quá nhỏ.
 */
ivts_err_t modem_cmd_take(char *out, size_t cap, size_t *len);

/**
 * @return Số command đến khi hàng đợi đầy kể từ khi boot. Module đã gửi PUBACK cho các
 *         command này nên chúng mất; cloud phải gửi lại.
 */
uint32_t modem_cmd_dropped(void);

/**
 * @name Nguồn byte HTTP cho OTA
 * Chỉ task "ota" được gọi. Mỗi hàm chặn caller cho đến khi task "modem" xử lý xong yêu cầu.
 * @{
 */

/**
 * @brief Mở URL và đọc header.
 * @param[out] size        Kích thước nội dung theo header.
 * @param[out] http_status Mã trạng thái HTTP.
 */
ivts_err_t modem_http_open(const char *url, uint32_t *size, int *http_status);

/**
 * @brief Đọc tối đa @p len byte từ vị trí @p offset của nội dung vào @p buf.
 * @param[out] got Số byte thực sự đọc được.
 */
ivts_err_t modem_http_read(uint32_t offset, uint8_t *buf, size_t len, size_t *got);

/** @brief Đóng phiên HTTP. */
void modem_http_close(void);
/** @} */
