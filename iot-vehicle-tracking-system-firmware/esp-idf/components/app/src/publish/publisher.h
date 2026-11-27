#pragma once
#include <stdbool.h>
#include "ivts_core/event/event.h"
#include "modem/modem.h"

/* The modem accepts one outstanding message. Keep its kind with the transaction ID. */
typedef enum {
    APP_MSG_NONE = 0,
    APP_MSG_RAW_LIVE,     /**< Mẫu telemetry thời gian thực. */
    APP_MSG_RAW_REPLAY,   /**< Bản ghi lấy từ offline queue. */
    APP_MSG_LOCATION,     /**< Vị trí gửi theo yêu cầu từ cloud. */
    APP_MSG_STATUS,       /**< Trạng thái thiết bị định kỳ. */
    APP_MSG_BOUNDARY,     /**< Mốc mở/đóng phiên đã lưu NVS. */
    APP_MSG_EVENT,        /**< Sự kiện đơn lẻ (ví dụ config_corrupt). */
    APP_MSG_ALARM,        /**< Cảnh báo chuyển động lưu NVS. */
    APP_MSG_FW,           /**< Trạng thái firmware/OTA. */
    APP_MSG_CMD_ACK,      /**< Phản hồi một command từ cloud. */
    APP_MSG_COUNT,
} app_msg_kind_t;

typedef void (*app_msg_ack_fn)(bool ok);

/* Install the ACK table at boot. Handlers run in the app task. */
void app_publisher_set_ack_handlers(const app_msg_ack_fn handlers[APP_MSG_COUNT]);

/* App task. Copy a payload to the modem when the slot is available. */
bool app_publisher_send(app_msg_kind_t kind, modem_topic_t topic, const char *payload, size_t len);
bool app_publisher_is_busy(void);
void app_publisher_on_ack(const ivts_event_t *event);
void app_publisher_poll(void);
