#pragma once

#include "app_config.h"
#include "app_state.h"

char *data_format_rawdata(const config_t *cfg, const telemetry_t *telemetry);
char *data_format_status(const config_t *cfg, const char *status, uint32_t session_id);
char *data_format_event(const config_t *cfg, const char *event_type, int code, const char *message);
char *data_format_firmware(const config_t *cfg, const firmware_status_t *status);
