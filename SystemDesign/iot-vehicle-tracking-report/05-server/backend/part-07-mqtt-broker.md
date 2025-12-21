## PHẦN VII: LỰA CHỌN VÀ CẤU HÌNH MQTT BROKER

### VII.1 MQTT Broker là gì?

**MQTT Broker** là middleware trung tâm nhận messages từ các publisher (tracker) và phân phối đến subscribers (backend). Nó hoạt động theo mô hình **publish-subscribe (Pub/Sub)**.

**Diagram:**
```
Tracker 1 ──┐
Tracker 2 ──┤─→ MQTT Broker ──→ Backend Adapter ──→ PostgreSQL + InfluxDB
Tracker 3 ──┘
```

### VII.2 So Sánh Các MQTT Broker

| Tiêu Chí | Mosquitto | EMQX | HiveMQ | VerneMQ |
|---------|-----------|------|--------|---------|
| **Concurrent Connections** | ⭐⭐ (1K) | ⭐⭐⭐⭐⭐ (100M) | ⭐⭐⭐⭐⭐ (200M) | ⭐⭐⭐ (10M) |
| **Message Throughput** | ⭐⭐⭐ (40k/s) | ⭐⭐⭐⭐⭐ (100k/s) | ⭐⭐⭐⭐⭐ (200k/s) | ⭐⭐⭐ (50k/s) |
| **Latency (ms)** | ⭐⭐⭐⭐ (0.25) | ⭐⭐⭐⭐ (0.27) | ⭐⭐⭐⭐ (<1) | ⭐⭐ (2.1) |
| **CPU Usage** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ (2%) | ⭐⭐⭐⭐ | ⭐⭐ (10%) |
| **Memory** | ⭐⭐⭐⭐⭐ (254M) | ⭐⭐⭐ (495M) | ⭐⭐⭐ | ⭐ (1.2G) |
| **Clustering** | ❌ | ✅ (20+ nodes) | ✅ | ✅ |
| **High Availability** | ❌ | ✅ | ✅ | ✅ |
| **Setup Complexity** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Cost** | Free | Free/Paid | Paid | Free/Paid |
| **Community** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

### VII.3 Khuyến Nghị Cho Luận Văn

**✅ EMQX Single Node (RECOMMENDED)**
- Cân bằng giữa complexity và features
- Scalable cho future
- Performance xuất sắc
- Free, community support tốt


