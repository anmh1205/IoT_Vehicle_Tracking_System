# Frontend Design

> Thiết kế giao diện dashboard cho hệ thống IoT

---

## 1. Design Principles

### 1.1 Core Principles

| Principle | Description |
|-----------|-------------|
| **Data-first** | Hiển thị data quan trọng nhất trước |
| **Real-time** | Cập nhật live, không cần refresh |
| **Responsive** | Mobile-first, adaptive layout |
| **Accessible** | WCAG 2.1 AA compliance |
| **Performance** | Fast load, smooth interactions |

### 1.2 Design System

| Element | Specification |
|---------|---------------|
| **Colors** | Neutral base + status colors |
| **Typography** | Inter/System font, 4 sizes |
| **Spacing** | 4px grid system |
| **Radius** | 6px default, 12px cards |
| **Shadows** | 3 levels (sm, md, lg) |

---

## 2. Color System

### 2.1 Base Colors

```css
/* Neutral */
--background: hsl(0 0% 100%);
--foreground: hsl(222 47% 11%);
--muted: hsl(210 40% 96%);
--muted-foreground: hsl(215 16% 47%);

/* Primary */
--primary: hsl(221 83% 53%);
--primary-foreground: hsl(0 0% 100%);

/* Secondary */
--secondary: hsl(210 40% 96%);
--secondary-foreground: hsl(222 47% 11%);
```

### 2.2 Status Colors

```css
/* Device Status */
--status-running: hsl(142 76% 36%);    /* Green */
--status-stopped: hsl(38 92% 50%);     /* Yellow/Amber */
--status-disconnected: hsl(0 84% 60%); /* Red */

/* Alert Severity */
--alert-info: hsl(221 83% 53%);        /* Blue */
--alert-warning: hsl(38 92% 50%);      /* Amber */
--alert-critical: hsl(0 84% 60%);      /* Red */
```

### 2.3 Dark Mode

```css
.dark {
  --background: hsl(222 47% 11%);
  --foreground: hsl(210 40% 98%);
  --muted: hsl(217 33% 17%);
  --muted-foreground: hsl(215 20% 65%);
}
```

---

## 3. Layout Structure

### 3.1 Main Layout

```
┌─────────────────────────────────────────────────────────────┐
│                         HEADER                               │
│  [Logo]              [Search]              [User] [Theme]   │
├──────────────┬──────────────────────────────────────────────┤
│              │                                               │
│   SIDEBAR    │                 MAIN CONTENT                  │
│              │                                               │
│  - Overview  │   ┌─────────────────────────────────────┐    │
│  - Devices   │   │         PAGE HEADER                  │    │
│  - Map       │   │   Title              [Actions]       │    │
│  - Analytics │   └─────────────────────────────────────┘    │
│  - Firmware  │                                               │
│  - Settings  │   ┌─────────────────────────────────────┐    │
│              │   │                                      │    │
│              │   │         PAGE CONTENT                 │    │
│              │   │                                      │    │
│              │   └─────────────────────────────────────┘    │
│              │                                               │
└──────────────┴──────────────────────────────────────────────┘
```

### 3.2 Responsive Breakpoints

| Breakpoint | Width | Sidebar |
|------------|-------|---------|
| Mobile | < 768px | Hidden (hamburger) |
| Tablet | 768-1024px | Collapsed (icons) |
| Desktop | > 1024px | Expanded |

---

## 4. Page Designs

### 4.1 Dashboard Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard Overview                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Total    │ │ Running  │ │ Sessions │ │ Alerts   │       │
│  │ Devices  │ │ Now      │ │ Today    │ │ Active   │       │
│  │   50     │ │   15     │ │   25     │ │    5     │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  ┌────────────────────────────┐ ┌────────────────────────┐  │
│  │     Device Status Chart    │ │    Recent Alerts       │  │
│  │                            │ │                        │  │
│  │         [Pie/Donut]        │ │  • Alert 1             │  │
│  │                            │ │  • Alert 2             │  │
│  │  ● Running  ● Stopped      │ │  • Alert 3             │  │
│  │  ● Disconnected            │ │                        │  │
│  └────────────────────────────┘ └────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Activity Feed                       │   │
│  │  12:00  Device A started session                      │   │
│  │  11:55  Device B reported error                       │   │
│  │  11:50  User admin logged in                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Device List

```
┌─────────────────────────────────────────────────────────────┐
│  Devices                                    [+ Add Device]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Search...]  [Status ▼]  [Sort ▼]              [Grid|List] │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ID          Name        Status    Last Seen   Actions │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ DEVICE_001  Device A    ● Running  2 min ago   [...]  │   │
│  │ DEVICE_002  Device B    ● Stopped  15 min ago  [...]  │   │
│  │ DEVICE_003  Device C    ● Disconn  2 hours     [...]  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Showing 1-20 of 50                    [<] [1] [2] [3] [>]  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Device Detail Modal

```
┌─────────────────────────────────────────────────────────────┐
│  Device A                                            [X]     │
├─────────────────────────────────────────────────────────────┤
│  [Info] [Sessions] [Analytics] [Errors] [Settings]          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Device Information                                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Device ID:    DEVICE_001                           │     │
│  │ Name:         Device A                             │     │
│  │ Status:       ● Running                            │     │
│  │ Last Seen:    2024-01-01 12:00:00                 │     │
│  │ Firmware:     v1.0.0 → v1.1.0 (pending)           │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  Current Readings                                            │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │ Sensor 1   │ │ Sensor 2   │ │ Battery    │              │
│  │   25.5°C   │ │   65%      │ │   4.15V    │              │
│  └────────────┘ └────────────┘ └────────────┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Map View (if applicable)

```
┌─────────────────────────────────────────────────────────────┐
│  Device Map                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │                    [MAP]                             │    │
│  │                                                      │    │
│  │     📍 Device A (Running)                           │    │
│  │                                                      │    │
│  │           📍 Device B (Stopped)                     │    │
│  │                                                      │    │
│  │                                                      │    │
│  │  [+] [-]                                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Legend: 🟢 Running  🟡 Stopped  🔴 Disconnected            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Component Library

### 5.1 UI Components (shadcn/ui)

| Component | Usage |
|-----------|-------|
| Button | Actions, submit |
| Input | Form inputs |
| Select | Dropdowns |
| Dialog | Modals |
| Card | Content containers |
| Table | Data tables |
| Tabs | Tab navigation |
| Badge | Status indicators |
| Toast | Notifications |

### 5.2 Custom Components

| Component | Description |
|-----------|-------------|
| StatusBadge | Device status with color |
| DataTable | Sortable, filterable table |
| StatsCard | Metric display card |
| DeviceCard | Device summary card |
| Chart | Recharts wrapper |
| Map | Leaflet map wrapper |

---

## 6. Interaction Patterns

### 6.1 Loading States

```
Initial Load:
  [Skeleton placeholders]

Refreshing:
  [Spinner in corner] + [Existing data visible]

Error:
  [Error message] + [Retry button]
```

### 6.2 Real-time Updates

```
New data arrives:
  1. Flash highlight (subtle)
  2. Smooth value transition
  3. No full re-render

Status change:
  1. Badge color transition
  2. Optional toast notification
```

### 6.3 Forms

```
Validation:
  - Inline errors below fields
  - Real-time validation on blur
  - Submit button disabled until valid

Submission:
  - Loading state on button
  - Success toast
  - Auto-close modal (if applicable)
```

---

## 7. Mobile Considerations

### 7.1 Touch Targets

- Minimum 44x44px for interactive elements
- Adequate spacing between buttons
- Swipe actions for lists (optional)

### 7.2 Mobile Navigation

```
┌─────────────────────────┐
│ [≡]  Dashboard     [👤] │
├─────────────────────────┤
│                         │
│    [Mobile Content]     │
│                         │
├─────────────────────────┤
│ [🏠] [📱] [🗺️] [⚙️]    │
│ Home Device Map Settings│
└─────────────────────────┘
```

---

## 8. Accessibility

### 8.1 Requirements

- Keyboard navigation
- Screen reader support
- Color contrast ratio ≥ 4.5:1
- Focus indicators
- ARIA labels

### 8.2 Implementation

```tsx
// Accessible button
<Button
  aria-label="Add new device"
  onClick={handleAdd}
>
  <PlusIcon aria-hidden="true" />
  Add Device
</Button>

// Status with screen reader
<Badge aria-label={`Status: ${status}`}>
  {status}
</Badge>
```
