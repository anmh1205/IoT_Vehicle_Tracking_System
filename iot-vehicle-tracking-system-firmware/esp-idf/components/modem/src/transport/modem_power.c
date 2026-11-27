/**
 * @file src/transport/modem_power.c
 * @brief SIM7600 PWRKEY sequencing and modem light-sleep lock.
 *
 * Startup prepares the configured GPIO and optional PM lock. The link service calls the modem-task
 * operations to pulse PWRKEY and guard against restarting during module shutdown.
 * The transport tracks timing and lock requests. The link service determines when to change power.
 */
#include "transport/transport.h"
#include "platform/platform.h"
#include "modem_internal.h"
#include "driver/gpio.h"
#include "esp_check.h"
#include "esp_pm.h"
#include "sdkconfig.h"

/* Startup initializes the GPIO and lock. The modem task alone changes lock and restart state. */
static int s_pwrkey_gpio;
static bool s_pwrkey_inverted;
static esp_pm_lock_handle_t s_pm;
static bool s_pm_held;
static uint64_t s_restart_at_ms;

void modem_power_init(void)
{
    s_restart_at_ms = 0;
}

bool modem_power_restart_is_blocked(void)
{
    return modem_now() < s_restart_at_ms;
}

esp_err_t modem_power_gpio_init(const modem_cfg_t *c)
{
    s_pwrkey_gpio = c->pin_pwrkey;
    s_pwrkey_inverted = c->pwrkey_inverted;
    gpio_config_t io = { .pin_bit_mask = 1ULL << c->pin_pwrkey, .mode = GPIO_MODE_OUTPUT };
    ESP_RETURN_ON_ERROR(gpio_config(&io), MODEM_TAG, "pwrkey");
    gpio_set_level(c->pin_pwrkey, c->pwrkey_inverted ? 0 : 1);     /* Release PWRKEY at its configured inactive level. */
    return ESP_OK;
}

esp_err_t modem_pm_lock_create(void)
{
#if CONFIG_PM_ENABLE
    ESP_RETURN_ON_ERROR(esp_pm_lock_create(ESP_PM_NO_LIGHT_SLEEP, 0, "modem", &s_pm), MODEM_TAG, "pm lock");
#endif
    return ESP_OK;
}

void modem_pm_hold(bool hold)
{
    /* Hold the PM lock during modem communication because light sleep gates UART. */
    if (s_pm == NULL || hold == s_pm_held) { return; }
    if (hold) { (void)esp_pm_lock_acquire(s_pm); } else { (void)esp_pm_lock_release(s_pm); }
    s_pm_held = hold;
}

void modem_power_pulse(uint32_t ms)
{
    int on = s_pwrkey_inverted ? 1 : 0;
    gpio_set_level(s_pwrkey_gpio, on);
    platform_delay_ms(ms);
    gpio_set_level(s_pwrkey_gpio, !on);
}

bool modem_power_down(void)
{
    if (modem_power_restart_is_blocked()) { return false; }
    modem_power_pulse(3000);
    /*
     * The SIM7600 UART can remain active during shutdown. Hardware Design
     * Table 9 shows STATUS typically falling after 26 seconds. This PCB does
     * not wire STATUS.
     */
    s_restart_at_ms = modem_now() + 30000u;
    return true;
}
