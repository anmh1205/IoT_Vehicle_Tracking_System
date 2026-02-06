# Frontend Features Specification

> Detailed feature specifications for the IoT Fleet Management System, aligned with the PostgreSQL schema defined in `10-database-postgresql.md`.
> This document guides the Feature-Sliced Design implementation in the `/features/` directory.

---

## 1. Feature Modules Overview

| Feature | Priority | Complexity | Dependencies | Status |
|---------|----------|------------|--------------|--------|
| **auth** | P0 | Medium | Users Table | ✅ Core |
| **dashboard** | P0 | High | All Tables | 🚧 In Progress |
| **vehicles** | P0 | High | Devices, Customers | 📝 Planned |
| **devices** | P0 | High | Firmware, Sessions | 📝 Planned |
| **customers** | P1 | Medium | Users | 📝 Planned |
| **trips** | P1 | High | Vehicles, Devices | 📝 Planned |
| **maintenance** | P2 | Medium | Vehicles | 📝 Planned |
| **geofences** | P2 | High | Vehicles | 📝 Planned |
| **alerts** | P1 | Medium | All Tables | 📝 Planned |

---

## 2. Vehicle Management (Fleet)

**Feature Name:** Vehicle Lifecycle Management
**Namespace:** `features/vehicles`

**User Story:**
As a Fleet Manager, I want to onboard new vehicles, assign tracking devices, and track insurance/registration expiry so that the fleet remains compliant and operational.

**UI Components Needed:**
1.  **VehicleDataTable:**
    -   Sortable columns: Plate #, VIN, Brand, Model, Year, Device ID, Status (Badge), Driver.
    -   Actions: Edit, Delete, Unpair Device, View History.
2.  **VehicleWizard (Create/Edit):**
    -   Step 1: Basic Info (Brand, Model, Type, Fuel).
    -   Step 2: Identifiers (VIN, Plate, Registration).
    -   Step 3: Device Pairing (Select from available devices).
    -   Step 4: Customer Assignment.
3.  **AssignmentModal:** Searchable dropdown to link an available `device_id` from the `devices` table to the `vehicles` table.
4.  **ExpiryWidget:** Dashboard widget showing vehicles with insurance expiring in < 30 days.

**Data Interactions:**
-   **List:** `GET /vehicles` (Join `devices`, `customers` for display names).
-   **Create:** `POST /vehicles` (Validate `plate_number` uniqueness).
-   **Update:** `PUT /vehicles/:id` (Handle device swapping logic).
-   **Available Devices:** `GET /devices?status=stopped&assigned=false` to populate dropdowns.

**Advanced Logic:**
-   **Device Swapping:** If a vehicle is assigned a new device, the system must prompt to unpair the old device or mark it as 'inactive'.
-   **Status Derivation:** If an active record exists in the `maintenance` table, the vehicle status should automatically reflect 'Maintenance' in the UI.

---

## 3. Device Management (IoT Hub)

**Feature Name:** Remote Device Configuration & Diagnostics
**Namespace:** `features/devices`

**User Story:**
As a Technician, I want to send remote commands to restart devices, update firmware, and view raw debug logs to resolve connectivity issues without physical access.

**UI Components Needed:**
1.  **CommandConsole:** Terminal-like UI to send specific MQTT commands (`REBOOT`, `SET_INTERVAL`, `GET_CONFIG`).
2.  **ConfigEditor:** JSON or Form-based editor for the `devices.config` JSONB column (e.g., `vibration_threshold`, `reporting_interval`).
3.  **FirmwareManager:** List of available versions from `firmware` table with a "Flash to Device" action.
4.  **DebugStream:** Real-time log viewer (WebSocket) subscribing to `device/+/logs`.

**Data Interactions:**
-   **Command:** `POST /devices/:id/command` (Backend proxies this to MQTT Broker).
-   **Update Config:** `PATCH /devices/:id` (Updates DB and sends MQTT config update).
-   **Firmware OTA:** `POST /firmware/update` (Creates `firmware_update_log` entry).
-   **Audit:** Read `device_audit_logs` to show who changed configurations.

**Advanced Logic:**
-   **Optimistic UI:** When sending a command, show "Pending" status until the device acknowledges via the MQTT 'ack' topic.
-   **Compatibility Check:** Prevent flashing firmware if `device.model` doesn't match `firmware.target_models`.

---

## 4. Customer Management (CRM)

**Feature Name:** B2B Customer Profiles
**Namespace:** `features/customers`

**User Story:**
As an Admin, I want to group vehicles by Customer (Company) and manage contact details so I can generate billing reports and provide partitioned access.

**UI Components Needed:**
1.  **CustomerProfile:** Header with Logo, Contact Info (`email`, `phone`, `tax_code`), and Map overview of their fleet.
2.  **FleetTree:** Hierarchical view: Customer -> Groups/Departments -> Vehicles.
3.  **UserAccessList:** Manage which `users` have access to this Customer's data (updates `user_device_access`).

**Data Interactions:**
-   **CRUD:** `customers` table.
-   **Relations:** Link `vehicles.customer_id`.
-   **Access Control:** Read/Write `user_device_access` table to grant permissions.

**Advanced Logic:**
-   **Cascading Suspension:** Toggle switch to "Suspend Customer". Logic must ask: "Do you also want to disable all 50 associated vehicles?"
-   **Storage:** `user_device_access` needs to be updated whenever a new vehicle is added to a Customer (if users have "All Customer Vehicles" permission).

---

## 5. Trip Management & Replay

**Feature Name:** Historical Trip Analysis
**Namespace:** `features/trips`

**User Story:**
As a Monitor, I want to replay a specific trip from last Tuesday to investigate a speeding complaint, seeing the exact path and speed at every point.

**UI Components Needed:**
1.  **TripTimeline:** Horizontal or vertical list of `trips` for a selected day, showing Start Time, End Time, Distance, and Fuel Used.
2.  **ReplayMap:** Dedicated map view with player controls (Play, Pause, 1x/2x/4x Speed, Scrubber).
3.  **TelemetryChart:** Synchronized Line chart showing Speed/Fuel/RPM aligned with the map playback scrubber.

**Data Interactions:**
-   **Trip List:** `GET /trips?vehicle_id=X&date=Y` (From PostgreSQL).
-   **Path Data:** `GET /trips/:id/points` (Fetches high-frequency coordinate data from VictoriaMetrics).
-   **Events:** Overlay `alerts` (harsh braking) on the map path.

**Advanced Logic:**
-   **Path Interpolation:** The frontend must interpolate intermediate points between GPS pings to create smooth marker movement during replay.
-   **Segment Coloring:** Color the route line based on speed (Green < 50, Yellow < 80, Red > 100).

---

## 6. Maintenance Management

**Feature Name:** Preventive Maintenance Scheduler
**Namespace:** `features/maintenance`

**User Story:**
As a Manager, I want to set up automatic maintenance schedules (e.g., Oil Change every 5000km) so the system notifies me when vehicles are due.

**UI Components Needed:**
1.  **MaintenanceCalendar:** Calendar view showing past services (green) and upcoming due dates (orange/red).
2.  **ServiceRecordForm:** Form to log completed maintenance (`cost`, `service_provider`, `notes`).
3.  **MileageForecaster:** Chart projecting when a vehicle will hit the next service mileage based on average daily usage.

**Data Interactions:**
-   **CRUD:** `maintenance` table.
-   **Vehicle Update:** Completing a maintenance record should optionally update `vehicles.status` back to 'active'.

**Advanced Logic:**
-   **Prediction Algo:** `Daily Avg Km = Total Km / Days Active`. `Days to Service = (Next Service Km - Current Km) / Daily Avg`.
-   **Auto-Alert:** Frontend checks if `current_mileage > next_service_mileage` and highlights the row in Red.

---

## 7. Geofencing (Zones)

**Feature Name:** Geofence Visual Editor
**Namespace:** `features/geofences`

**User Story:**
As a Dispatcher, I want to draw a polygon around the "Main Warehouse" and get alerted whenever a truck enters or exits this zone.

**UI Components Needed:**
1.  **MapDrawTools:** Toolbar (Leaflet-Draw or similar) for drawing Circles, Polygons, and Rectangles on the map.
2.  **ZoneManager:** Sidebar list of defined zones (`geofences` table) with toggle switches for "Active".
3.  **VehicleBinder:** Multi-select interface to create records in `geofence_vehicles`.

**Data Interactions:**
-   **Spatial Save:** Convert map shapes to GeoJSON for `geofences.coordinates` and calculated `radius_meters`.
-   **Assignment:** Bulk insert/delete into `geofence_vehicles`.

**Advanced Logic:**
-   **Validation:** Prevent self-intersecting polygons in the UI before submission.
-   **Area Calculation:** Display the estimated area (sq meters/km) of the shape while drawing.

---

## 8. Alerts & Rules Engine

**Feature Name:** Configurable Alert System
**Namespace:** `features/alerts`

**User Story:**
As an Admin, I want to configure rules (e.g., "Speed > 100km/h") and choose who receives the SMS/Email notification.

**UI Components Needed:**
1.  **AlertFeed:** Real-time list of triggered `alerts` with "Acknowledge" and "Resolve" actions.
2.  **NotificationMatrix:** Grid view to toggle Alert Types vs. Channels (Push/Email/SMS) for the logged-in user or system-wide.
3.  **IncidentReport:** Modal showing details of an alert: Map location, Speed, Threshold, and Driver at the time.

**Data Interactions:**
-   **Feed:** `GET /alerts` (polled or socket-pushed).
-   **Action:** `PUT /alerts/:id/acknowledge` (Updates `acknowledged_by` and `acknowledged_at`).
-   **Configuration:** Updates user preferences or system settings.

**Advanced Logic:**
-   **Grouping:** The UI should group repeated alerts (e.g., 50 speeding alerts in 1 minute) into a single "Incident" to prevent list clutter.

---

## 9. System Administration

**Feature Name:** Global System Configuration
**Namespace:** `features/admin`

**User Story:**
As a Super Admin, I want to manage system-wide settings (SMTP, SMS gateways, feature toggles) dynamically without redeploying the backend.

**UI Components Needed:**
1.  **SettingsEditor:** A dynamic form builder or JSON editor for `system_settings` table.
2.  **FeatureToggles:** Boolean switches for enabling/disabling modules (e.g., "Enable Registration", "Maintenance Mode").

**Data Interactions:**
-   **Fetch:** `GET /admin/settings` (Returns grouped settings).
-   **Update:** `PUT /admin/settings/:key` (Updates JSON value).

---

## 10. Firmware Management

**Feature Name:** OTA Firmware Operations
**Namespace:** `features/firmware`

**User Story:**
As a Technician, I want to upload new firmware versions and deploy them to specific device groups so that I can patch bugs and add features remotely.

**UI Components Needed:**
1.  **FirmwareList:** Table displaying uploaded versions (`version`, `size`, `upload_date`, `device_count`).
    *   Actions: "Activate", "Delete", "Assign to Devices".
2.  **UploadModal:** Drag-and-drop zone for `.bin` files with version input fields.
3.  **DeploymentDashboard:**
    *   Real-time progress bars for ongoing updates.
    *   Stats: Success vs. Failure rates.
    *   List of devices currently updating.
4.  **DeviceSelector:** Advanced filter to select target devices (e.g., "All devices with version < 1.2.0").

**Data Interactions:**
-   **Upload:** `POST /firmware` (Multipart).
-   **Assign:** `POST /firmware/:id/assign` (Triggers backend jobs).
-   **Monitor:** `GET /firmware/:id/devices` (Polled for status updates).

**Advanced Logic:**
-   **Validation:** frontend checks file extension (`.bin`) and warns if version number format doesn't match SemVer.
-   **Safety Check:** Require confirmation before deploying to >10 devices at once.

---

## 11. Advanced Map Tracking

**Feature Name:** High-Performance Live Tracking
**Namespace:** `features/map`

**User Story:**
As a Monitor, I want to see thousands of vehicles on a single map without lag, with clustered views for dense areas, and seamless interaction between the vehicle list and the map markers.

**UI Components Needed:**
1.  **ClusterMap:** Map component using `react-leaflet-cluster` to group nearby vehicles.
    *   Behavior: Click cluster -> Zoom to bounds.
    *   Styling: Color-coded clusters based on status (Red if any vehicle in cluster is Critical, else Green).
2.  **LayerSwitcher:** Control to toggle between "Satellite", "Street", and "Traffic" layers.
3.  **MapToolbar:** Floating controls for "Follow Mode" (auto-pan to selected vehicle), "Show Geofences", and "Heatmap Mode".
4.  **SyncedList:** Vehicle list that highlights the row when a map marker is clicked, and flies to the marker when a row is clicked.

**Advanced Logic:**
-   **List-Map Sync:** maintain a `selectedVehicleId` in global state (Zustand). Both the List component and Map component subscribe to this.
    -   *List Click:* Calls `map.flyTo(lat, lon)` and sets state.
    -   *Marker Click:* Scrolls list to the specific row and sets state.
-   **Throttling:** Limit map re-renders to 500ms even if high-frequency telemetry arrives.
-   **Ghost Markers:** Show "Ghost" trail of the last 5 positions for the selected vehicle to indicate direction.

---

## 12. Real-time Architecture

**Feature Name:** Live State Synchronization
**Namespace:** `features/realtime`

**User Story:**
As a User, I expect the data on my screen (status, location, alerts) to update instantly without refreshing the page.

**Architecture:**
1.  **RealtimeProvider:** A global context provider wrapping the app.
    -   Manages the single Socket.IO connection.
    -   Handles authentication (sending JWT on connect).
    -   Manages reconnection logic (exponential backoff).
2.  **Subscription Logic (Rooms):**
    -   **Global Room:** `user:{userId}` (Personal notifications).
    -   **Fleet Room:** `fleet:{customer_id}` (Telemetry for all vehicles in a fleet).
    -   **Device Room:** `device:{deviceId}` (Detailed debug logs, only joined when viewing Device Detail).
3.  **Optimistic Updates:**
    -   When toggling a switch (e.g., "Engine Lock"), immediately update UI state to "Pending...".
    -   Revert if Socket.IO returns an error or timeout.

**Data Interactions:**
-   **Socket Events:**
    -   `telemetry:update`: Batch of GPS/Status updates.
    -   `alert:new`: Toast notification trigger.
    -   `device:ack`: Acknowledgement of sent commands.


