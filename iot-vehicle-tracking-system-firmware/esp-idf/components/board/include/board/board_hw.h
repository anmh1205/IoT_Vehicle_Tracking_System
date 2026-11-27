#pragma once

/* PCB IVTS. GPIO33..37 cần module không dùng octal PSRAM. */
#define BOARD_PIN_I2C_SDA        2
#define BOARD_PIN_I2C_SCL        1
#define BOARD_PIN_IMU_INT1       36   /**< INT1 nối chân vật lý 41 của ESP32-S3. GPIO36 chỉ đánh thức light sleep. */
#define BOARD_PIN_ADC_VEHICLE    3    /**< ADC1, chia áp 11:1. */
#define BOARD_PIN_ADC_DEVICE     4
#define BOARD_PIN_MODEM_TX       17
#define BOARD_PIN_MODEM_RX       18
#define BOARD_PIN_MODEM_PWRKEY   34   /**< GPIO33..37 dành cho octal flash/PSRAM: chỉ dùng được khi module không có octal PSRAM. */
#define BOARD_PIN_MODEM_RESET    35   /**< Dây RESET hiện chưa được dùng. */
#define BOARD_PIN_LED            15
#define BOARD_PIN_SD_CLK         10
#define BOARD_PIN_SD_CMD         9
#define BOARD_PIN_SD_D0          11
#define BOARD_PIN_SD_D1          12
#define BOARD_PIN_SD_D2          7
#define BOARD_PIN_SD_D3          8
#define BOARD_PIN_SD_CD          13
#define BOARD_MODEM_UART_NUM     1
#define BOARD_MODEM_BAUD         115200
#define BOARD_MODEM_PWRKEY_INVERTED 1
#define BOARD_ADC_DIVIDER           11u
#define BOARD_ADC_GAIN_VEHICLE_PPM  1020070u
#define BOARD_ADC_GAIN_DEVICE_PPM   1019950u
#define BOARD_IMU_INT_IS_RTC_GPIO   0
#define BOARD_RTC_I2C_ADDR          0x68u
#define BOARD_RTC_I2C_HZ            100000u
#define BOARD_IMU_I2C_ADDR_PRIMARY  0x1Du
#define BOARD_IMU_I2C_ADDR_ALT      0x1Eu
#define BOARD_IMU_I2C_HZ           400000u
