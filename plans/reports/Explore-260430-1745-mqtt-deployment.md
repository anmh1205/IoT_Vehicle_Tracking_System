# Explore: MQTT/EMQX Public Exposure Deployment

**Agent:** Explore  
**Date:** 2026-04-30  
**Branch:** uat  
**Focus:** Deployment files for EMQX/Nginx Proxy Manager public MQTT/WSS exposure

---

## Key File Paths (main branch, not worktrees)

| File | Purpose |
|------|--------|
| `iot-vehicle-Tracking_EMQX/docker-compose.Tracking_yml` | EMQX container definition |
| `iot-vehicle-Tracking_Tracking_EMQX/etc/emqx.conf` | EMQX listener/port config |
| `iot-vehicle-Tracking_Tracking_EMQX/.env.Tracking_example` | EMQX env template |
| `iot-vehicle-Tracking_Tracking_NPM/docker-compose.Tracking_yml` | Nginx-Proxy-Manager container |
| `iot-vehicle-Tracking_Tracking_Tracking_Backend/.env.Tracking_example` | Backend MQTT client config |
| `docs/cicd-required-Tracking-secrets-Tracking-and-env.md` | CI/CD orchestration doc |

---

## EMQX Listeners (from `etc/emqx.conf`)

EMQX bind **all** listeners on `0.0.0.0` inside container:

| Protocol | Port | Exposed via NPM? |
|----------|------|-----------------|
| MQTT/TCP | 1883 | No (internal only) |
| MQTT/TLS | **8883** | No |
| **WebSocket** | **8083** | ✅ Yes |
| **WebSocket/TLS (WSS)** | **8084** | ✅ Yes |
| Dashboard HTTP | 18083 | No (internal) |

⚠️ **Important:** Port in docker-compose is `8883` (SSL), but in `emqx.conf` the SSL listener is `8883` while the config file shows `8883`. Need to verify that port mapping in `docker-compose.Tracking_yml` actually maps `8883` — currently the docker-compose shows only `18083` internal but **does NOT define any `ports:` section**, meaning EMQX ports are only reachable inside `tracking-Tracking-network`.

---

## Public MQTT/WSS Exposure Chain

```
Internet
  |
  v
Nginx-Proxy-Manager (ports 80/443/81/8883)
  |-- thingdock.dev     --> tracking-frontend:4001
  |-- be.thingdock.dev --> tracking-backend:4000
  |-- mqtt.thingdock.dev --> tracking-Tracking_Tracking_EMQX:8083  (WS)
  |
  v
EMQX listener.Tracking_ws.default (port 8083)
  wss.Tracking_default (port 8084)
```

Source: `docs/cicd-required-Tracking-secrets-Tracking-and-env.md` line 60:
> `mqtt.thingdock.dev` → `tracking-Tracking_Tracking_EMQX:8083`

---

## Firmware MQTT Config (ESP32 tracker)

Hardcoded defaults:
- `CONFIG_Tracking_TRACKER_DEFAULT_MQTT_HOST="mqtt.thingdock.dev"` (`sdkconfig`, `Kconfig.projbuild`)
- Primary port: **TLS 8883** (via SIM7600 modem TLS)
- WSS not used directly by firmware; firmware uses raw TLS MQTT on port 8883

Firmware connects via SIM7600 LTE modem using **MQTT over TLS** on port 8883 — this bypasses NPM and connects directly to EMQX.

---

## How Public MQTT Is Supposed To Be Exposed

1. **Nginx-Proxy-Manager** receives HTTPS traffic for `mqtt.thingdock.dev` on port 443.
2. NPM proxies/upgrades to WebSocket (`ws://tracking-Tracking_Tracking_EMQX:8083`) internally.
3. Firmware (ESP32) does **NOT** go through NPM — it connects TLS direct to port 8883 (port exposed at host level on VPS).
4. Frontend (browser) connects via **WSS** (`wss://mqtt.thingdock.dev:443/mqtt`) routed through NPM.

---

## Unresolved Questions

1. Does EMQX `docker-compose.Tracking_yml` actually map port `8883` to host? The file shows no `ports:` section — need to verify if port 8883 is accessible externally or only via internal Docker network.
2. Is `mqtt.meht.Tracking_vn` referenced anywhere in the actual deployment config, or is that just in thesis/docs?
3. Are the TLS certificates (`emqx.pem`, `emqx.key`, `cacert.pem`) mounted via volume or auto-generated?

