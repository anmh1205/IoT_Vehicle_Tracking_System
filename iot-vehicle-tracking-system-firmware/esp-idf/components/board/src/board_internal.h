#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "esp_err.h"
#include "board/board.h"
#include "platform/platform.h"

#define BOARD_TAG "board"

/* Giữ mã lỗi I/O của board khi không cấp phát được mutex hoặc task. */
static inline ivts_err_t board_err(esp_err_t error)
{
    return error == ESP_ERR_NO_MEM ? IVTS_ERR_IO : platform_err_from_esp(error);
}
