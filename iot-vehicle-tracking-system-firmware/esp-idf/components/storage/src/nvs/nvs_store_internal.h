#pragma once
#include "esp_err.h"

/* Initialize NVS without erasing existing data. */
esp_err_t storage_nvs_init(void);
