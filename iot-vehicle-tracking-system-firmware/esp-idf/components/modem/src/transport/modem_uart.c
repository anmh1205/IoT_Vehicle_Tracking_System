/**
 * @file modem_uart.c
 * @brief Dedicated UART transport for SIM7600 AT bytes.
 *
 * Opening UART binds the app-supplied pins and baud rate. Receive timeout uses
 * the same tick conversion as the scheduler.
 */
#include "transport/transport.h"
#include "platform/platform.h"
#include "modem_internal.h"
#include "driver/uart.h"
#include "esp_check.h"

#define UART_RX_BUF 4096
#define UART_TX_BUF 2048

static uart_port_t s_uart_num;

esp_err_t modem_uart_open(const modem_cfg_t *c)
{
    uart_config_t uc = {
        .baud_rate = (int)c->baud,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_XTAL,    /* Keep baud timing stable across APB frequency changes. */
    };
    ESP_RETURN_ON_ERROR(uart_driver_install(c->uart_num, UART_RX_BUF, UART_TX_BUF, 0, NULL, 0), MODEM_TAG, "uart install");
    ESP_RETURN_ON_ERROR(uart_param_config(c->uart_num, &uc), MODEM_TAG, "uart cfg");
    ESP_RETURN_ON_ERROR(uart_set_pin(c->uart_num, c->pin_tx, c->pin_rx, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE),
                        MODEM_TAG, "uart pin");
    s_uart_num = c->uart_num;
    return ESP_OK;
}

void modem_uart_write(void *ctx, const void *buf, size_t n)
{
    (void)ctx;
    (void)uart_write_bytes(s_uart_num, buf, n);
}

int modem_uart_read(uint8_t *data, size_t cap, uint32_t wait_ms)
{
    return uart_read_bytes(s_uart_num, data, cap, platform_timeout_ticks(wait_ms));
}

void modem_uart_flush(void)
{
    (void)uart_flush_input(s_uart_num);
}
