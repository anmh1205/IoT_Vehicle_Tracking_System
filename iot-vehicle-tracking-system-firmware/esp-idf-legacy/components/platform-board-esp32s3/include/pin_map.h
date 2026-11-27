#pragma once

#include "driver/gpio.h"
#include "driver/uart.h"

/**
 * @file pin_map.h
 * @brief Hardware pin and peripheral mapping for ESP32-S3 board.
 * This header belongs to the ESP32-S3 board support layer and describes the board-facing contract that runtime code uses without baking GPIO details into app-core.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/* Voltage sensing */
/** @brief Vehicle +12V supply sense, read through an 11:1 resistor divider. Maps to ADC1 channel 2. */
#define PIN_U_SUPPLY_ADC GPIO_NUM_3
/** @brief Backup battery sense, read through an 11:1 resistor divider. Maps to ADC1 channel 3. */
#define PIN_U_BATT_ADC GPIO_NUM_4

/* Modem control + UART */
/** @brief Modem UART TX pin (MCU -> modem RXD), carries outbound AT commands. */
#define PIN_MODEM_TX GPIO_NUM_17
/** @brief Modem UART RX pin (modem TXD -> MCU), carries inbound AT responses/URCs. */
#define PIN_MODEM_RX GPIO_NUM_18
/** @brief Modem sleep handshake pin (MCU -> modem, SIM-DTR). NC = not wired on this board revision; DTR control is a no-op. */
#define PIN_MODEM_DTR GPIO_NUM_NC
/** @brief User-facing status LED (MCU -> USER-LED). */
#define PIN_USER_LED GPIO_NUM_15
/** @brief Modem power-key control pin (MCU -> modem, SIM7600 PWR-KEY). Pulsed to power the modem on/off. */
#define PIN_MODEM_PWRKEY GPIO_NUM_34
/** @brief Modem hardware reset control pin (MCU -> modem, SIM7600 RESET). Pulsed for forced recovery. */
#define PIN_MODEM_RESET GPIO_NUM_35
/** @brief Modem power-state status input (SIM7600 STATUS). NC = not wired; modem_read_status returns unsupported. */
#define PIN_MODEM_STATUS GPIO_NUM_NC
/** @brief Modem network-activity LED input (SIM7600 NET-LIGHT). NC = not wired; modem_read_netlight returns unsupported. */
#define PIN_MODEM_NETLIGHT GPIO_NUM_NC

/* I2C sensor bus (LIS3DSH IMU and DS3231 RTC share one bus) */
/** @brief LIS3DSH motion interrupt output 1 (INT1) -> MCU input. */
#define PIN_LIS3DSH_INT1 GPIO_NUM_41
/** @brief LIS3DSH motion interrupt output 2 (INT2) -> MCU input (currently unused). */
#define PIN_LIS3DSH_INT2 GPIO_NUM_42
/** @brief Active IMU interrupt line wired into the firmware wake flow (aliases INT1). */
#define PIN_LIS3DSH_INT PIN_LIS3DSH_INT1
/** @brief Shared I2C SDA line (IMU + RTC). Internal pull-up enabled in the driver. */
#define PIN_LIS3DSH_SDA GPIO_NUM_2
/** @brief Shared I2C SCL line (IMU + RTC). */
#define PIN_LIS3DSH_SCL GPIO_NUM_1
/** @brief DS3231 RTC SDA pin. Same physical line as the IMU SDA (shared bus). */
#define PIN_DS3231_SDA GPIO_NUM_2
/** @brief DS3231 RTC SCL pin. Same physical line as the IMU SCL (shared bus). */
#define PIN_DS3231_SCL GPIO_NUM_1


/* SDMMC (4-bit SD card interface for local data buffering/logging) */
/** @brief SDMMC data line 2 (DAT2). */
#define PIN_SDMMC_D2 GPIO_NUM_7
/** @brief SDMMC data line 3 (DAT3). */
#define PIN_SDMMC_D3 GPIO_NUM_8
/** @brief SDMMC command line (CMD). */
#define PIN_SDMMC_CMD GPIO_NUM_9
/** @brief SDMMC clock line (CLK), driven by the host controller. */
#define PIN_SDMMC_CLK GPIO_NUM_10
/** @brief SDMMC data line 0 (DAT0). */
#define PIN_SDMMC_D0 GPIO_NUM_11
/** @brief SDMMC data line 1 (DAT1). */
#define PIN_SDMMC_D1 GPIO_NUM_12
/** @brief Card-detect input; LOW typically indicates a card is inserted. */
#define PIN_SDMMC_CD GPIO_NUM_13
/** @brief Write-protect input. NC = not wired; write-protect detection unavailable. */
#define PIN_SDMMC_WP GPIO_NUM_NC

/* Bus constants */
/** @brief SDMMC data bus width in bits (4-bit mode uses DAT0..DAT3). */
#define SDMMC_BUS_WIDTH 4

/** @brief UART peripheral used for modem AT communication (dedicated to the SIM7600 link). */
#define MODEM_UART_NUM UART_NUM_1
/** @brief UART baud rate for modem communication; SIM7600 autobauds but settles to this fixed rate. */
#define MODEM_UART_BAUD 115200
/**
 * @brief Fixed UART line inversion mask for modem link.
 *
 * Netlist-locked modem UART: no line inversion.
 * Keep fixed at 0 and avoid runtime auto-swap/invert probing.
 */
#define MODEM_UART_LINE_INVERSE_MASK 0U
