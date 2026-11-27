# IVTS bench ECU simulator

The Arduino Uno and MCP2515 emulate a single gasoline powertrain ECU on a
dedicated 11-bit, 500 kbit/s CAN bench. Connect SPI to the MCP2515 and use D10
for chip select. Use 120 ohm termination at both ends of the bench and share
ground between the Arduino, transceiver and scanner. The Arduino supplies no
vehicle power to the OBD connector.

Build with `pio run -e uno` for an 8 MHz MCP2515 oscillator or
`pio run -e uno-mcp2515-16mhz` for a 16 MHz oscillator. The serial monitor
uses 115200 baud with a newline after each command.

| Command | Behavior |
| --- | --- |
| `ign on`, `ign off` | Start or stop the current drive cycle. The default cycle runs for roughly 222 seconds and parks for six minutes. |
| `ign on 120`, `ign off 30` | Hold the selected ignition state for the given number of seconds, then resume the previous state. |
| `ign status` | Print ignition and remaining override time. |
| `fault on`, `fault off` | Enable or remove the selected fault condition. Retains diagnostic memory. |
| `fault lean`, `fault misfire`, `fault catalyst` | Pick a deterministic fault profile while no DTCs are retained. Lean cruise is the initial profile. |

The drive includes key-on, cranking, reverse, creep, acceleration, shifts,
cruise, kickdown, braking and hot or cold idle. Mode 01 exposes live PIDs and
readiness. Modes 02, 03, 07 and 0A report freeze-frame, confirmed, pending and
permanent diagnostic data. Mode 04 clears eligible diagnostics while
stationary and retains permanent codes until their monitor passes on
subsequent drives. Mode 09 PID 02 returns the simulator VIN `TSTATS116N0000001` using
ISO-TP Flow Control. Transmit captures should show responses only from ECU
address `0x7E8` to requests addressed to `0x7DF` or `0x7E0`.

The model sets a pending code on the first qualifying failed drive and a
confirmed code, MIL and permanent code on the second. Freeze-frame and the
DTC journal survive resets. The drive and monitor timers are tuned for bench
testing a single profile.

Run `python test/host/run.py` with a C++ compiler to exercise the production
model and transport against simulated CAN, clock and EEPROM. For the physical
check, run an OBD scanner or ELM327 on the terminated bench, confirm the VIN,
and capture the first DTC, freeze frame, clear and permanent-DTC responses.
Then run Arduino ECU, ELM327 BLE, IVTS and the cloud dashboard together.
