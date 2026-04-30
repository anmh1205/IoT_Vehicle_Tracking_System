-- =============================================================================
-- 15-canonical-telemetry-fields.sql
-- Rename session battery columns and backfill canonical telemetry keys
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'device_sessions'
      AND column_name = 'avg_battery_top'
  ) THEN
    ALTER TABLE device_sessions RENAME COLUMN avg_battery_top TO avg_vehicle_battery;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'device_sessions'
      AND column_name = 'avg_battery_bot'
  ) THEN
    ALTER TABLE device_sessions RENAME COLUMN avg_battery_bot TO avg_device_battery;
  END IF;
END $$;

UPDATE event_logs
SET context = jsonb_strip_nulls(
  (
    context
    || CASE
      WHEN COALESCE(context->'latitude', context->'lat') IS NULL
        THEN '{}'::jsonb
      ELSE jsonb_build_object('latitude', COALESCE(context->'latitude', context->'lat'))
    END
    || CASE
      WHEN COALESCE(context->'longitude', context->'lon') IS NULL
        THEN '{}'::jsonb
      ELSE jsonb_build_object('longitude', COALESCE(context->'longitude', context->'lon'))
    END
    || CASE
      WHEN COALESCE(context->'speed', context->'spd') IS NULL
        THEN '{}'::jsonb
      ELSE jsonb_build_object('speed', COALESCE(context->'speed', context->'spd'))
    END
    || CASE
      WHEN COALESCE(context->'course', context->'heading') IS NULL
        THEN '{}'::jsonb
      ELSE jsonb_build_object('course', COALESCE(context->'course', context->'heading'))
    END
    || CASE
      WHEN COALESCE(
        context->'vehicle_battery',
        context->'battery_top',
        context->'vehicleBattery',
        context->'batt',
        context->'bt'
      ) IS NULL
        THEN '{}'::jsonb
      ELSE jsonb_build_object(
        'vehicle_battery',
        COALESCE(
          context->'vehicle_battery',
          context->'battery_top',
          context->'vehicleBattery',
          context->'batt',
          context->'bt'
        )
      )
    END
    || CASE
      WHEN COALESCE(
        context->'device_battery',
        context->'battery_bot',
        context->'deviceBattery',
        context->'bb'
      ) IS NULL
        THEN '{}'::jsonb
      ELSE jsonb_build_object(
        'device_battery',
        COALESCE(
          context->'device_battery',
          context->'battery_bot',
          context->'deviceBattery',
          context->'bb'
        )
      )
    END
    || CASE
      WHEN COALESCE(context->'vibration', context->'vib') IS NULL
        THEN '{}'::jsonb
      ELSE jsonb_build_object('vibration', COALESCE(context->'vibration', context->'vib'))
    END
    || CASE
      WHEN COALESCE(context->'temperature', context->'temp') IS NULL
        THEN '{}'::jsonb
      ELSE jsonb_build_object('temperature', COALESCE(context->'temperature', context->'temp'))
    END
    || CASE
      WHEN COALESCE(context->'error_code', context->'err') IS NULL
        THEN '{}'::jsonb
      ELSE jsonb_build_object('error_code', COALESCE(context->'error_code', context->'err'))
    END
  )
  - 'lat'
  - 'lon'
  - 'spd'
  - 'heading'
  - 'battery_top'
  - 'battery_bot'
  - 'vehicleBattery'
  - 'deviceBattery'
  - 'batt'
  - 'bt'
  - 'bb'
  - 'vib'
  - 'temp'
  - 'err'
)
WHERE context IS NOT NULL
  AND context ?| ARRAY[
    'lat',
    'lon',
    'spd',
    'heading',
    'battery_top',
    'battery_bot',
    'vehicleBattery',
    'deviceBattery',
    'batt',
    'bt',
    'bb',
    'vib',
    'temp',
    'err'
  ];

UPDATE event_logs
SET context = jsonb_set(
  context,
  '{raw_payload}',
  jsonb_strip_nulls(
    jsonb_build_object(
      'device_id', COALESCE(context#>'{raw_payload,device_id}', context#>'{raw_payload,deviceId}'),
      'timestamp', context#>'{raw_payload,timestamp}',
      'uptime', context#>'{raw_payload,uptime}',
      'data', jsonb_strip_nulls(jsonb_build_object(
        'vibration', COALESCE(context#>'{raw_payload,data,vibration}', context#>'{raw_payload,data,vib}'),
        'vehicle_battery', COALESCE(
          context#>'{raw_payload,data,vehicle_battery}',
          context#>'{raw_payload,data,battery_top}',
          context#>'{raw_payload,data,batt}',
          context#>'{raw_payload,data,bt}'
        ),
        'device_battery', COALESCE(
          context#>'{raw_payload,data,device_battery}',
          context#>'{raw_payload,data,battery_bot}',
          context#>'{raw_payload,data,bb}'
        ),
        'latitude', COALESCE(context#>'{raw_payload,data,latitude}', context#>'{raw_payload,data,lat}'),
        'longitude', COALESCE(context#>'{raw_payload,data,longitude}', context#>'{raw_payload,data,lon}'),
        'speed', COALESCE(context#>'{raw_payload,data,speed}', context#>'{raw_payload,data,spd}'),
        'course', COALESCE(context#>'{raw_payload,data,course}', context#>'{raw_payload,data,heading}'),
        'satellites', COALESCE(context#>'{raw_payload,data,satellites}', context#>'{raw_payload,data,sat}'),
        'ignition', context#>'{raw_payload,data,ignition}',
        'error_code', COALESCE(context#>'{raw_payload,data,error_code}', context#>'{raw_payload,data,err}')
      )),
      'diagnostics', context#>'{raw_payload,diagnostics}',
      'state', context#>'{raw_payload,state}',
      'device_alerts', context#>'{raw_payload,device_alerts}',
      'ecu_alerts', context#>'{raw_payload,ecu_alerts}',
      'metadata', context#>'{raw_payload,metadata}'
    )
  ),
  true
)
WHERE context IS NOT NULL
  AND context ? 'raw_payload'
  AND jsonb_typeof(context->'raw_payload') = 'object';
