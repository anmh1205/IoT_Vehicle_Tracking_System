# Board

| Folder | Responsibility |
| --- | --- |
| `include/board` | Board setup, RTC, power, sensor APIs and the PCB pin map |
| `src/bsp` | Driver wiring and the board task that reads ADC and handles IMU interrupts |
| `src/bus` | Shared I2C bus, device registration and transaction mutex |
| `src/drivers` | DS3231M, LIS3DSH, ADC calibration and pure conversions |
| `src/power` | Timer and IMU wake, sleep entry and wake reason |

The app initializes the board and calls its sleep and RTC APIs. The board task samples ADC and handles latched IMU interrupts. The GPIO ISR wakes that task. RTC and IMU transactions share the mutex in `i2c_bus.c`.

To change PCB wiring, edit `include/board/board_hw.h`. For a new I2C sensor, add its driver and conversion tests, declare its PCB parameters there and wire the driver in `src/bsp/board.c`. Sleep and wake changes belong in `src/power`.
