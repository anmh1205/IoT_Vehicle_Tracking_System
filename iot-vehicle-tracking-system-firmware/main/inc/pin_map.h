#pragma once

#include "driver/gpio.h"
#include "driver/uart.h"

/**
 * @file pin_map.h
 * @brief Hardware pin and peripheral mapping for ESP32-S3 board.
 */

/* Voltage sensing */
/** @brief +12V source divider ADC input. */
#define PIN_U_SUPPLY_ADC GPIO_NUM_3
/** @brief Battery divider ADC input. */
#define PIN_U_BATT_ADC GPIO_NUM_4

/* Modem control + UART */
/** @brief Modem UART TX pin (MCU -> modem). */
#define PIN_MODEM_TX GPIO_NUM_17
/** @brief Modem UART RX pin (modem -> MCU). */
#define PIN_MODEM_RX GPIO_NUM_18
/** @brief Modem sleep handshake pin (MCU -> modem, SIM-DTR). */
#define PIN_MODEM_DTR GPIO_NUM_NC
/** @brief User LED pin (MCU -> USER-LED). */
#define PIN_USER_LED GPIO_NUM_21
/** @brief Modem power-key control pin (MCU -> modem, SIM7600 PWR-KEY). */
#define PIN_MODEM_PWRKEY GPIO_NUM_34
/** @brief Modem hardware reset control pin (MCU -> modem, SIM7600 RESET). */
#define PIN_MODEM_RESET GPIO_NUM_35
/** @brief Modem status input pin (SIM7600 STATUS). */
#define PIN_MODEM_STATUS GPIO_NUM_NC
/** @brief Modem network light input pin (SIM7600 NET-LIGHT). */
#define PIN_MODEM_NETLIGHT GPIO_NUM_NC

/* I2C sensor bus */
/** @brief LIS3DSH interrupt pin (INT1). */
#define PIN_LIS3DSH_INT1 GPIO_NUM_41
/** @brief LIS3DSH interrupt pin (INT2). */
#define PIN_LIS3DSH_INT2 GPIO_NUM_42
/** @brief Active LIS3DSH interrupt pin used by firmware flow. */
#define PIN_LIS3DSH_INT PIN_LIS3DSH_INT1
/** @brief LIS3DSH I2C SDA pin. */
#define PIN_LIS3DSH_SDA GPIO_NUM_2
/** @brief LIS3DSH I2C SCL pin. */
#define PIN_LIS3DSH_SCL GPIO_NUM_1
/** @brief DS3231 I2C SDA pin. */
#define PIN_DS3231_SDA GPIO_NUM_2
/** @brief DS3231 I2C SCL pin. */
#define PIN_DS3231_SCL GPIO_NUM_1


/* SDMMC */
/** @brief SDMMC DAT2 pin. */
#define PIN_SDMMC_D2 GPIO_NUM_7
/** @brief SDMMC DAT3 pin. */
#define PIN_SDMMC_D3 GPIO_NUM_8
/** @brief SDMMC CMD pin. */
#define PIN_SDMMC_CMD GPIO_NUM_9
/** @brief SDMMC CLK pin. */
#define PIN_SDMMC_CLK GPIO_NUM_10
/** @brief SDMMC DAT0 pin. */
#define PIN_SDMMC_D0 GPIO_NUM_11
/** @brief SDMMC DAT1 pin. */
#define PIN_SDMMC_D1 GPIO_NUM_12
/** @brief SDMMC card-detect pin. */
#define PIN_SDMMC_CD GPIO_NUM_13
/** @brief SDMMC write-protect pin. */
#define PIN_SDMMC_WP GPIO_NUM_NC

/* Bus constants */
/** @brief SDMMC bus width. */
#define SDMMC_BUS_WIDTH 4

/** @brief UART peripheral used for modem AT communication. */
#define MODEM_UART_NUM UART_NUM_1
/** @brief UART baud rate for modem communication. */
#define MODEM_UART_BAUD 115200
/**
 * @brief Fixed UART line inversion mask for modem link.
 *
 * Netlist-locked modem UART: no line inversion.
 * Keep fixed at 0 and avoid runtime auto-swap/invert probing.
 */
#define MODEM_UART_LINE_INVERSE_MASK 0U
