#pragma once
#include "ota_executor_internal.h"

const esp_partition_t *esp_ota_get_running_partition(void);
const esp_partition_t *esp_partition_find_first(int type, int subtype, const char *label);
esp_err_t esp_ota_get_state_partition(const esp_partition_t *partition, esp_ota_img_states_t *state);
esp_err_t esp_ota_set_boot_partition(const esp_partition_t *partition);
