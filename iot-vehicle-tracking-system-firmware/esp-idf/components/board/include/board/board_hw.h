/**
 * @file include/board/board_hw.h
 * @brief Pin assignments, bus speeds and ADC calibration for the IVTS PCB.
 *
 * Board drivers and app wiring use this map. The app passes the relevant pins to the modem and storage
 * adapters.
 * The map contains constants. Task ownership, I/O and waiting are defined by the adapter that uses each pin.
 */
#pragma once

/* PCB map. GPIO33 through GPIO37 require a module without octal PSRAM. */
#define BOARD_PIN_I2C_SDA        2   /**< I2C data GPIO shared by the RTC and IMU. */
#define BOARD_PIN_I2C_SCL        1   /**< I2C clock GPIO shared by the RTC and IMU. */
#define BOARD_PIN_IMU_INT1       36   /**< LIS3DSH INT1 on module pin 41. GPIO36 supports light-sleep wake. */
#define BOARD_PIN_ADC_VEHICLE    3    /**< Vehicle-supply ADC1 GPIO behind an 11:1 divider. */
#define BOARD_PIN_ADC_DEVICE     4   /**< Device-supply ADC1 GPIO. */
#define BOARD_PIN_MODEM_TX       17   /**< ESP UART transmit GPIO to the modem. */
#define BOARD_PIN_MODEM_RX       18   /**< ESP UART receive GPIO from the modem. */
#define BOARD_PIN_MODEM_PWRKEY   34   /**< Modem power-key control GPIO. */
#define BOARD_PIN_MODEM_RESET    35   /**< Modem reset GPIO. App wiring passes it to the modem configuration. */
#define BOARD_PIN_LED            15   /**< User LED output GPIO. */
#define BOARD_PIN_SD_CLK         10   /**< SDMMC clock GPIO. */
#define BOARD_PIN_SD_CMD         9   /**< SDMMC command GPIO. */
#define BOARD_PIN_SD_D0          11   /**< SDMMC data bit 0 GPIO. */
#define BOARD_PIN_SD_D1          12   /**< SDMMC data bit 1 GPIO. */
#define BOARD_PIN_SD_D2          7   /**< SDMMC data bit 2 GPIO. */
#define BOARD_PIN_SD_D3          8   /**< SDMMC data bit 3 GPIO. */
#define BOARD_PIN_SD_CD          13   /**< SDMMC card-detect GPIO. */
#define BOARD_MODEM_UART_NUM     1   /**< ESP UART controller index for the modem. */
#define BOARD_MODEM_BAUD         115200   /**< Modem UART rate in bits per second. */
#define BOARD_MODEM_PWRKEY_INVERTED 1   /**< Nonzero selects inverted modem power-key control. */
#define BOARD_ADC_DIVIDER           11u   /**< Input-to-pin voltage ratio applied to both ADC channels. */
#define BOARD_ADC_GAIN_VEHICLE_PPM  1020070u   /**< Vehicle channel multiplier in parts per million. */
#define BOARD_ADC_GAIN_DEVICE_PPM   1019950u   /**< Device channel multiplier in parts per million. */
#define BOARD_IMU_INT_IS_RTC_GPIO   0   /**< Zero disables RTC GPIO deep-sleep wake for INT1. */
#define BOARD_RTC_I2C_ADDR          0x68u   /**< 7-bit address of the DS3231M. */
#define BOARD_RTC_I2C_HZ            100000u   /**< RTC bus clock in hertz. */
#define BOARD_IMU_I2C_ADDR_PRIMARY  0x1Du   /**< First 7-bit LIS3DSH address probed. */
#define BOARD_IMU_I2C_ADDR_ALT      0x1Eu   /**< 7-bit address probed if the primary address fails. */
#define BOARD_IMU_I2C_HZ           400000u   /**< IMU bus clock in hertz. */
