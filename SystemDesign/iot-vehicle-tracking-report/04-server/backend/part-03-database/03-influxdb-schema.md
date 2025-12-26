## PHẦN IX.4: INFLUXDB SCHEMA (TIME-SERIES DATA)

**Measurement: location**

```flux
location
  tags:
    - device_id (string)
    - vehicle_id (string)
  fields:
    - lat (float)
    - lon (float)
    - alt (float) -- altitude
    - speed (float) -- km/h
    - course (float) -- heading degree
    - satellites (int)
  timestamp: auto
```

**Measurement: obd2_data**

```flux
obd2_data
  tags:
    - device_id (string)
    - vehicle_id (string)
  fields:
    - ign (boolean)
    - rpm (int)
    - speed (int) -- km/h
    - fuel (int) -- %
    - temp (int) -- engine temperature
  timestamp: auto
```

**Measurement: power**

```flux
power
  tags:
    - device_id (string)
    - vehicle_id (string)
  fields:
    - battery_voltage (float) -- V
    - backup_battery (float) -- V
    - power_source (string) -- 'battery' or 'backup'
    - charger_enabled (boolean)
  timestamp: auto
```

**Measurement: imu_data**

```flux
imu_data
  tags:
    - device_id (string)
    - vehicle_id (string)
  fields:
    - accel_x (float)
    - accel_y (float)
    - accel_z (float)
    - motion_detected (boolean)
  timestamp: auto
```

**Retention Policies:**

- **Default**: 30 days (raw data)
- **Aggregated**: 1 year (hourly/daily aggregates)

