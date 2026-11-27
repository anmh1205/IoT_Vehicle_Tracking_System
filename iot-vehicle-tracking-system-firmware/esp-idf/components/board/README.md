# Board

| Source | Responsibility |
| --- | --- |
| `include/board` | Public setup, RTC, power and sensor APIs, plus the dedicated PCB pin map |
| `src/board.c`, `src/board_task.c` | Driver wiring, ADC sampling and latched IMU events |
| `src/drivers/` | I2C device registry, timed transaction lock, DS3231M, LIS3DSH, calibrated ADC and host-testable conversions |
| `src/power/` | Sleep entry, wake-source configuration and wake reason |

App wiring initializes the board and supplies the event sink. The IMU ISR wakes the board task. That task reads and clears the latched interrupt and sends the motion event. RTC and IMU transactions share the platform mutex in `src/drivers/i2c_bus.c`.

PCB wiring changes go in `include/board/board_hw.h`. For a new I2C sensor, add its driver and private declarations under `src/drivers/`, test any conversion in `src/drivers/drivers_calc.c` and wire the driver in `src/board.c`.
