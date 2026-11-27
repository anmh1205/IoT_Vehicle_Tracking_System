#pragma once
#include "esp_err.h"
#include "ivts_core/base/err.h"

/** Translate the SDK error at a component's I/O boundary. */
ivts_err_t platform_err_from_esp(esp_err_t error);
