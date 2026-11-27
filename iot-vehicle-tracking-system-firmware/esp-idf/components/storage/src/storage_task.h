#pragma once
#include "esp_err.h"

/* Create the request queue and its only consumer after initializing NVS and SD. */
esp_err_t storage_task_start(void);
