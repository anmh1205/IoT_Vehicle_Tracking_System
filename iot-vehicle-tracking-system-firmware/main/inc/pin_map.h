#pragma once

#include "driver/gpio.h"
#include "driver/uart.h"

/**
 * @file pin_map.h
 * @brief Hardware pin and peripheral mapping for ESP32-S3 board.
 */

/** @brief Ignition input pin. */
#define PIN_IGN_IN GPIO_NUM_2
/** @brief Battery divider ADC input. */
#define PIN_U_BATT_ADC GPIO_NUM_4
/** @brief Charger enable output pin. */
#define PIN_CHARGER_EN GPIO_NUM_5
/** @brief Modem UART TX pin (MCU -> modem). */
#define PIN_MODEM_TX GPIO_NUM_16
/** @brief Modem UART RX pin (modem -> MCU). */
#define PIN_MODEM_RX GPIO_NUM_17
/** @brief Power source multiplexer select pin. */
#define PIN_POWER_MUX_SEL GPIO_NUM_18
/** @brief Low-voltage detector status input pin. */
#define PIN_LVD_STATUS GPIO_NUM_19
/** @brief LIS3DSH interrupt pin (INT1). */
#define PIN_LIS3DSH_INT GPIO_NUM_21
/** @brief LIS3DSH I2C SDA pin. */
#define PIN_LIS3DSH_SDA GPIO_NUM_47
/** @brief LIS3DSH I2C SCL pin. */
#define PIN_LIS3DSH_SCL GPIO_NUM_48
/** @brief Modem power-key control pin (SIM7600 PWR-KEY). */
#define PIN_MODEM_PWRKEY GPIO_NUM_26
/** @brief Modem hardware reset control pin (SIM7600 RESET). */
#define PIN_MODEM_RESET GPIO_NUM_NC
/** @brief Modem sleep handshake pin (SIM7600 SIM-DTR). */
#define PIN_MODEM_DTR GPIO_NUM_NC
/** @brief Modem status input pin (SIM7600 STATUS). */
#define PIN_MODEM_STATUS GPIO_NUM_NC
/** @brief Modem network light input pin (SIM7600 NET-LIGHT). */
#define PIN_MODEM_NETLIGHT GPIO_NUM_NC

/** @brief UART peripheral used for modem AT communication. */
#define MODEM_UART_NUM UART_NUM_1
/** @brief UART baud rate for modem communication. */
#define MODEM_UART_BAUD 115200
