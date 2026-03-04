#pragma once

#include "app_config.h"
#include "esp_err.h"

esp_err_t nvs_config_init(void);
esp_err_t nvs_config_load(config_t *config);
esp_err_t nvs_config_save(const config_t *config);
