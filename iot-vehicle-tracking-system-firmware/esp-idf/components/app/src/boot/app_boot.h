#pragma once
#include <stdbool.h>

/* Initialize components in dependency order before starting the app task. */
bool app_boot_init(void);
