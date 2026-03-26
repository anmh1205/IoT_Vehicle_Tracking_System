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
/** @brief LIS3DH interrupt pin (INT1). */
#define PIN_LIS3DH_INT GPIO_NUM_21
/** @brief LIS3DH I2C SDA pin. */
#define PIN_LIS3DH_SDA GPIO_NUM_47
/** @brief LIS3DH I2C SCL pin. */
#define PIN_LIS3DH_SCL GPIO_NUM_48
/** @brief Modem power-key control pin. */
#define PIN_MODEM_PWRKEY GPIO_NUM_26

/** @brief UART peripheral used for modem AT communication. */
#define MODEM_UART_NUM UART_NUM_1
/** @brief UART baud rate for modem communication. */
#define MODEM_UART_BAUD 115200
