#pragma once
#include "esp_err.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "modem/modem.h"

typedef enum {
    REQ_LINK = 0,     /**< Bật/tắt liên kết (on). */
    REQ_GNSS,         /**< Bật/tắt GNSS (on). */
    REQ_PUB_KICK,     /**< Đánh thức vòng lặp khi ô publish có bản tin mới. */
    REQ_HTTP_OPEN,    /**< Mở URL HTTP. */
    REQ_HTTP_READ,    /**< Đọc nội dung HTTP. */
    REQ_HTTP_CLOSE    /**< Đóng phiên HTTP. */
} modem_req_op_t;

/**
 * Yêu cầu từ task khác tới task "modem", sao chép theo giá trị vào the request queue.
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

/* Initialize I/O and create the only consumer of the request queue. */
esp_err_t modem_task_start(const modem_cfg_t *cfg);
/* Copy a request into the task queue. HTTP callers may wait for space. */
ivts_err_t modem_task_post(const modem_req_t *request, uint32_t timeout_ms);
