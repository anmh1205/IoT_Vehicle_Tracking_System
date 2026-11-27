#pragma once
#include "esp_err.h"

#define ESP_RETURN_ON_FALSE(condition, error, ...) do { \
    if (!(condition)) { return (error); } \
} while (0)

const char *esp_err_to_name(esp_err_t error);
