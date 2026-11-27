#pragma once
#include <stdint.h>

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
