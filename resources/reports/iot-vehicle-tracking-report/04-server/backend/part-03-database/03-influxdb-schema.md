## PHẦN IX.4: VICTORIAMETRICS SCHEMA (TIME-SERIES DATA)

> **📌 Cập nhật**: Đã chuyển từ InfluxDB sang VictoriaMetrics theo kiến trúc IVM26.

### Tổng Quan

VictoriaMetrics là time-series database tương thích Prometheus với hiệu năng cao hơn InfluxDB:
- **Query Language**: PromQL/MetricsQL (thay vì Flux)
- **Write Protocol**: Prometheus remote write hoặc InfluxDB line protocol
- **Performance**: 10x nhanh hơn InfluxDB, tiêu thụ RAM ít hơn

---

### Metrics Schema

**Location Metrics:**

```promql
# Vị trí GPS
device_latitude{device_id="TRACKER_001", vehicle_id="VH001"} 22.123456
device_longitude{device_id="TRACKER_001", vehicle_id="VH001"} 105.123456
device_altitude{device_id="TRACKER_001", vehicle_id="VH001"} 15.5
device_speed{device_id="TRACKER_001", vehicle_id="VH001"} 60.0
device_course{device_id="TRACKER_001", vehicle_id="VH001"} 180.0
device_satellites{device_id="TRACKER_001", vehicle_id="VH001"} 12
```

**OBD2 Metrics:**

```promql
# Dữ liệu OBD2
device_ignition{device_id="TRACKER_001", vehicle_id="VH001"} 1
device_rpm{device_id="TRACKER_001", vehicle_id="VH001"} 2500
device_vehicle_speed{device_id="TRACKER_001", vehicle_id="VH001"} 60
device_fuel_level{device_id="TRACKER_001", vehicle_id="VH001"} 75
device_engine_temp{device_id="TRACKER_001", vehicle_id="VH001"} 90
```

**Power Metrics:**

```promql
# Thông tin nguồn điện
device_battery_voltage{device_id="TRACKER_001", vehicle_id="VH001"} 12.6
device_backup_battery{device_id="TRACKER_001", vehicle_id="VH001"} 3.8
device_power_source{device_id="TRACKER_001", vehicle_id="VH001", source="main"} 1
device_charger_enabled{device_id="TRACKER_001", vehicle_id="VH001"} 1
```

**IMU Metrics:**

```promql
# Dữ liệu cảm biến gia tốc
device_acceleration{device_id="TRACKER_001", vehicle_id="VH001", axis="x"} 0.02
device_acceleration{device_id="TRACKER_001", vehicle_id="VH001", axis="y"} 0.01
device_acceleration{device_id="TRACKER_001", vehicle_id="VH001", axis="z"} 9.81
device_motion_detected{device_id="TRACKER_001", vehicle_id="VH001"} 0
```

---

### Query Examples (PromQL/MetricsQL)

**Lấy vị trí 1 giờ gần nhất:**

```promql
device_latitude{device_id="TRACKER_001"}[1h]
device_longitude{device_id="TRACKER_001"}[1h]
```

**Tốc độ trung bình 24h:**

```promql
avg_over_time(device_speed{device_id="TRACKER_001"}[24h])
```

**Tốc độ tối đa 24h:**

```promql
max_over_time(device_speed{device_id="TRACKER_001"}[24h])
```

**Devices đang online (có data trong 5 phút):**

```promql
count(device_latitude offset 0s) by (device_id)
```

**Lịch sử di chuyển (range query):**

```promql
# API: /api/v1/query_range
device_latitude{device_id="TRACKER_001"}
# Parameters: start, end, step
```

---

### Write Data (HTTP API)

**Prometheus Format:**

```bash
# POST /api/v1/import/prometheus
curl -X POST "http://victoriametrics:8428/api/v1/import/prometheus" \
  -d 'device_latitude{device_id="TRACKER_001",vehicle_id="VH001"} 22.123456'
```

**InfluxDB Line Protocol (Compatible):**

```bash
# POST /write
curl -X POST "http://victoriametrics:8428/write" \
  -d 'location,device_id=TRACKER_001,vehicle_id=VH001 lat=22.123456,lon=105.123456'
```

**JSON Import:**

```bash
# POST /api/v1/import
curl -X POST "http://victoriametrics:8428/api/v1/import" \
  -H "Content-Type: application/json" \
  -d '{
    "metric": {"__name__": "device_latitude", "device_id": "TRACKER_001"},
    "values": [22.123456],
    "timestamps": [1704067200000]
  }'
```

---

### Node.js Integration

```typescript
// victoriametrics/client.ts
import fetch from 'node-fetch';

const VM_URL = process.env.VICTORIAMETRICS_URL || 'http://localhost:8428';

export async function writeMetrics(metrics: string[]) {
  const body = metrics.join('\n');
  await fetch(`${VM_URL}/api/v1/import/prometheus`, {
    method: 'POST',
    body,
  });
}

export async function writeLocationData(
  deviceId: string,
  lat: number,
  lon: number,
  speed: number
) {
  const timestamp = Date.now();
  const metrics = [
    `device_latitude{device_id="${deviceId}"} ${lat} ${timestamp}`,
    `device_longitude{device_id="${deviceId}"} ${lon} ${timestamp}`,
    `device_speed{device_id="${deviceId}"} ${speed} ${timestamp}`,
  ];
  await writeMetrics(metrics);
}
```

```typescript
// victoriametrics/query.ts
export async function queryRange(
  query: string,
  start: number,
  end: number,
  step: string = '1m'
) {
  const url = new URL(`${VM_URL}/api/v1/query_range`);
  url.searchParams.set('query', query);
  url.searchParams.set('start', start.toString());
  url.searchParams.set('end', end.toString());
  url.searchParams.set('step', step);

  const response = await fetch(url.toString());
  return response.json();
}

export async function getDeviceLocation(deviceId: string, hours: number = 1) {
  const end = Math.floor(Date.now() / 1000);
  const start = end - hours * 3600;

  const [latData, lonData] = await Promise.all([
    queryRange(`device_latitude{device_id="${deviceId}"}`, start, end),
    queryRange(`device_longitude{device_id="${deviceId}"}`, start, end),
  ]);

  return { lat: latData, lon: lonData };
}
```

---

### Retention Policy

**VictoriaMetrics Configuration:**

```yaml
# docker-compose.yml
victoriametrics:
  image: victoriametrics/victoria-metrics:v1.96.0
  command:
    - "-retentionPeriod=30d"          # Raw data: 30 ngày
    - "-storageDataPath=/storage"
    - "-httpListenAddr=:8428"
  volumes:
    - vm-data:/storage
```

**Downsampling (Optional):**

Sử dụng vmagent với recording rules để tạo aggregated data:

```yaml
# recording_rules.yml
groups:
  - name: device_aggregates
    interval: 1h
    rules:
      - record: device_speed:hourly_avg
        expr: avg_over_time(device_speed[1h])
      - record: device_speed:hourly_max
        expr: max_over_time(device_speed[1h])
```

---

### So Sánh: InfluxDB vs VictoriaMetrics

| Aspect | InfluxDB | VictoriaMetrics (Đã chọn) |
|--------|----------|---------------------------|
| **Query Language** | Flux (complex) | PromQL (simple) |
| **Performance** | Good | 10x faster |
| **RAM Usage** | High | Low |
| **Compression** | Good | Better (up to 10x) |
| **Prometheus Compatible** | No | Yes |
| **Learning Curve** | Steep (Flux) | Easy (PromQL) |
| **Grafana Integration** | Plugin | Native |

**Kết luận:** VictoriaMetrics phù hợp hơn cho IoT với high-frequency data và yêu cầu hiệu năng cao.
