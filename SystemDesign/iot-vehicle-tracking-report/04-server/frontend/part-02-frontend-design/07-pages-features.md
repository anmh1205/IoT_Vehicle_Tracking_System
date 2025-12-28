## XIII.7 Key Pages & Features

### XIII.7.1 Dashboard Overview (`/dashboard`)

**Components:**
- Stats cards: Tổng số xe, chuyến đi hôm nay, cảnh báo chưa xử lý, vi phạm
- Recent alerts table
- Active vehicles map (mini)
- Recent trips list
- Charts: Trips per day, alerts by type

### XIII.7.2 Vehicle Management (`/dashboard/vehicles`)

**List Page:**
- Data table với columns: Biển số, Brand/Model, Status, Device, Last seen, Actions
- Filters: Status, Vehicle type, Search
- Actions: View, Edit, Delete, View on map

**Detail Page:**
- Vehicle info card
- Current location map
- Device status
- Active alerts
- Recent trips
- Maintenance history
- [Phase 2] Current booking info

### XIII.7.3 Trip Management (`/dashboard/trips`)

**List Page:**
- Data table: Trip ID, Vehicle, Customer, Start/End time, Distance, Duration, Status
- Filters: Vehicle, Customer, Date range, Status

**Detail Page:**
- Trip info card
- Route map với stops
- Speed chart
- Violations list
- Events timeline

### XIII.7.4 Real-time Map (`/dashboard/map`)

**Features:**
- All vehicles markers
- Real-time position updates (WebSocket)
- Vehicle popup với status
- Filter by vehicle/status
- Geofence visualization
- Route replay

### XIII.7.5 Alert Management (`/dashboard/alerts`)

**List Page:**
- Data table với severity badges
- Filters: Type, Severity, Vehicle, Date range
- Bulk actions: Acknowledge, Resolve

**Detail Page:**
- Alert info
- Location map
- Related vehicle/customer
- Actions: Acknowledge, Resolve

### XIII.7.6 Notification Settings (`/dashboard/notifications`)

**Features:**
- Telegram connection (connect/disconnect)
- Email settings
- Alert type preferences
- Severity filter
- Vehicle filter
- Test notification button

