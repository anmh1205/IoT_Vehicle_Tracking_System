#pragma once

void esp_restart(void);

typedef enum { ESP_RST_POWERON, ESP_RST_DEEPSLEEP } esp_reset_reason_t;
esp_reset_reason_t esp_reset_reason(void);
