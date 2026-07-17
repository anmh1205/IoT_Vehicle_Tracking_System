# Research Report: simple AT dynamics model for Arduino ECU simulator

- Conducted: 2026-05-03 15:01 Asia/Saigon
- Scope: generic small/mid gasoline sedan, conventional automatic, simple but believable simulator
- Sources: x-engineer speed/RPM formula, generic AT references, common production behavior patterns

## Executive summary
For an Arduino ECU simulator, do not model full engine torque maps or full hydraulic transmission logic. Use a state model with: current gear, engine RPM, vehicle speed, throttle, brake, coolant-temp surrogate, and a small torque-converter slip term. That gives believable behavior with low CPU cost.

Best baseline: 4AT or early 6AT style behavior. If goal is generic sedan and easy tuning, 4 forward gears is enough. Compute wheel-linked RPM from speed, tire circumference, gear ratio, and final drive. Then blend engine RPM toward either idle target or wheel-linked RPM plus a slip offset. Shifts should be table-driven by throttle bands with hysteresis, kickdown, and a short shift inhibit timer.

## Practical baseline assumptions
- Vehicle mass not needed unless you also simulate acceleration physics.
- Use speed as primary observable state if another subsystem already generates it.
- Use RPM as dependent state from speed + throttle + slip.
- Use 4AT baseline first. Add 5th/6th later only if needed.

## Suggested ratio profile
A believable small/mid sedan automatic baseline:

```text
final_drive = 4.10
gear_ratios = [2.85, 1.55, 1.00, 0.70]
reverse_ratio = 2.30
```

Why this works:
- 1st strong enough for launch and creep multiplication feel
- 2nd moderate drop
- 3rd near direct drive
- 4th overdrive for cruise
- final drive 3.9-4.3 keeps road-speed/RPM believable for small NA gasoline cars

If you want a 6AT feel later:
`[3.50, 2.10, 1.40, 1.00, 0.80, 0.65]`, `final_drive 3.7-4.3`

## Speed-RPM-gear linkage
Core wheel-linked formula:

```text
wheel_rps = vehicle_speed_mps / tire_circumference_m
engine_rpm_locked = wheel_rps * 60 * gear_ratio[current_gear] * final_drive
```

Reference relation matches standard drivetrain math when converter/clutch slip ignored.

Use a common sedan tire default if no tire model exists:

```text
tire_circumference_m = 1.95 to 2.05   // e.g. 195/65R15, 205/55R16 class
```

## Torque converter / slip simplification
Do not simulate fluid coupling physics. Use 3 modes:

1. Park/Neutral: engine free-runs toward throttle-based target RPM
2. Drive low speed: unlocked converter, allow slip
3. Cruise: near-locked, low slip

Simple model:

```text
slip_rpm = base_slip_rpm + throttle * slip_gain_rpm - speed_kph * slip_decay
slip_rpm = clamp(slip_rpm, min_slip_rpm, max_slip_rpm)
```

Recommended start values:
- `base_slip_rpm = 80..120`
- `slip_gain_rpm = 600..1000`
- `slip_decay = 8..15 rpm/kph`
- `min_slip_rpm = 0`
- `max_slip_rpm = 1200`

Then:

```text
engine_rpm_target = max(idle_target_rpm, engine_rpm_locked + slip_rpm)
```

At steady cruise above lockup threshold, reduce slip hard:

```text
if speed_kph > 55 and throttle < 0.25:
  slip_rpm *= 0.15
```

## Warm-up idle settling
Need believable cold-start behavior. Use coolant-temp surrogate or elapsed-time ramp.

Simple target idle:

```text
idle_target_rpm = lerp(hot_idle_rpm, cold_idle_rpm, cold_factor)
cold_factor = clamp((warmup_temp_c - coolant_temp_c) / warmup_temp_c, 0, 1)
```

Good defaults:
- `cold_idle_rpm = 1100..1250`
- `hot_idle_rpm = 700..800`
- `warmup_temp_c = 80`

If no coolant model, fake it with time:

```text
coolant_temp_c += warmup_rate * dt   // until 85-90C
```

Use 1st-order smoothing so RPM settles, not jumps:

```text
engine_rpm += (engine_rpm_target - engine_rpm) * rpm_response_gain * dt
```

## Idle creep
In Drive with brake off and low throttle, sedan should creep.

Minimal rule if speed is simulator-owned:

```text
if gear in D and brake == 0 and throttle < 0.08:
  speed_target_kph = creep_speed_cold_or_hot   // 5..9 kph
```

Better rule:

```text
creep_speed_target = base_creep_kph + cold_factor * 1.0
creep_strength = 1 - throttle/0.08
```

Brake applied should suppress creep acceleration, but engine RPM may stay slightly above pure idle because converter loads engine.

## Shift schedule
Use throttle-band upshift/downshift tables with hysteresis. KISS and tunable.

Example 4AT schedule, speed in kph:

```text
upshift[1->2]   = [12, 18, 28, 40]   // throttle bands 0.0/0.25/0.5/0.75
upshift[2->3]   = [24, 36, 52, 72]
upshift[3->4]   = [42, 58, 78, 100]

downshift[2->1] = [8, 14, 20, 28]
downshift[3->2] = [18, 28, 40, 56]
downshift[4->3] = [34, 46, 62, 82]
```

Rules:
- Higher throttle delays upshift.
- Downshift threshold must be lower than upshift threshold.
- Add `shift_inhibit_ms = 600..1200` to stop hunting.
- Add throttle hysteresis or filtered throttle.

Throttle-band lookup:

```pseudo
band = mapThrottleToBand(throttle)
if speed > upshift[g][band] and throttle < WOT and timer_expired: g++
if speed < downshift[g][band] and timer_expired: g--
```

## Kickdown
Kickdown should override normal schedule when throttle is large and current RPM after downshift would remain below redline.

Simple rule:

```pseudo
if throttle > 0.80:
  if gear == 4 and projected_rpm_in_3rd < max_safe_rpm: gear = 3
  if throttle > 0.92 and gear >= 3 and projected_rpm_in_2nd < max_safe_rpm: gear = 2
```

Good defaults:
- `max_safe_rpm = 5800..6200`
- require `throttle_rate > threshold` if you want true stomp behavior

Projected RPM:

```text
projected_rpm = engine_rpm_locked * target_gear_ratio / current_gear_ratio
```

## Decel / engine braking
On closed throttle, engine RPM should stay coupled enough to feel drag in low gears.

Simple approach:
- When `throttle < 0.03` and gear in Drive, reduce slip toward zero.
- Hold current gear slightly longer during decel.
- In 1st/2nd, stronger braking effect; in 4th weaker.

If simulator also owns speed dynamics:

```text
decel_drag = base_roll_drag + gear_drag_factor[current_gear] * closed_throttle_factor
```

Suggested relative gear drag factors:
`[1.00, 0.70, 0.45, 0.25]`

Also block upshift during light decel unless RPM too high.

## Minimal state update pseudocode
```pseudo
read inputs: throttle, brake, selector, speed, dt, coolant
update idle_target from warm-up
choose gear using shift table + kickdown + inhibit timer
compute engine_rpm_locked from speed and gear
compute slip_rpm from throttle/speed/mode
if selector in P/N:
  rpm_target = idle_target + throttle * free_rev_gain
else:
  rpm_target = max(idle_target, engine_rpm_locked + slip_rpm)
apply rpm smoothing
if simulator owns speed:
  apply creep, accel, brake, decel drag
clamp rpm to [stall_floor, rev_limit]
```

## Parameters that should be configurable
Must-configure:
- `gear_ratios[]`
- `final_drive`
- `tire_circumference_m`
- `cold_idle_rpm`, `hot_idle_rpm`, `warmup_rate` or coolant model params
- `rev_limit_rpm`, `max_safe_rpm`
- `slip model`: base/gain/decay/min/max
- `shift tables`: upshift/downshift by throttle band
- `shift_inhibit_ms`
- `kickdown_throttle`, optional `kickdown_rate`
- `creep_speed_kph`, `creep_enable_throttle_max`
- `gear_drag_factor[]`
- `rpm_response_gain`

Nice-to-have later, not required now:
- Sport/Eco mode alternate shift tables
- Torque-converter lockup threshold table
- Road grade/load factor
- AC/alternator idle load bump

## Recommended default package
If you want one sane preset:

```text
4AT, final_drive 4.10
ratios [2.85, 1.55, 1.00, 0.70]
hot_idle 750, cold_idle 1150
rev_limit 6200
creep 7 kph
shift_inhibit 800 ms
slip base 100, gain 800, decay 10
```

This is enough to feel realistic without overbuilding.

## References
- x-engineer drivetrain speed/RPM relation: https://x-engineer.org/calculate-wheel-vehicle-speed-engine-speed/
- Generic AT behavior overview: https://en.wikipedia.org/wiki/Automatic_transmission
- Generic transmission fundamentals: https://gearsmagazine.com/magazine/the-fundamentals-of-a-transmission/

## Unresolved questions
- Simulator owns vehicle speed too, or only derives RPM/gear from an external speed profile?
- Need 4AT simplicity or closer modern 6AT behavior?
- Need selector states P/R/N/D/2/L exposed, or only D-mode logic?
- Need OBD-style load/MAP/TPS coherence, or RPM-speed-gear realism is enough?