# Board

| Source | Responsibility |
| --- | --- |
| `include/board` | Public setup, RTC, power and sensor APIs, plus the dedicated PCB pin map |
| `src/board.c`, `src/board_task.c` | Driver wiring, ADC sampling and latched IMU events |
| `src/i2c_bus.c` | I2C device registry and timed transaction lock |
| `src/drivers/`, `src/board_calc.c` | DS3231M, LIS3DSH, calibrated ADC and host-testable conversions |
| `src/sleep.c`, `src/wake.c` | Sleep entry, wake-source configuration and wake reason |

App wiring initializes the board and supplies the event sink. The IMU ISR wakes the board task. That task reads and clears the latched interrupt and sends the motion event. RTC and IMU transactions share the platform mutex in `i2c_bus.c`.

PCB wiring changes go in `include/board/board_hw.h`. For a new I2C sensor, add its driver and private declarations under `src/drivers/`, test any conversion in `board_calc.c` and wire the driver in `src/board.c`.
