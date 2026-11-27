#pragma once
#include "ivts_core/model/config.h"

/* Convert device policy into the axes and FSM parameters used by the app task. */
void app_config_apply(const ivts_config_t *config);
