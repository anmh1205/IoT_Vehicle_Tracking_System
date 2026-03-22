# File Implementation Checklist

This checklist maps every reviewed `src` file to the likely UX workstream and audit focus so implementation can proceed without losing coverage.

## app/dashboard

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/app/dashboard/admin/system/page.tsx` | 1 | foundation | Phase 6-7 |
| `src/app/dashboard/admin/system-status/page.tsx` | 1 | foundation | Phase 6-7 |
| `src/app/dashboard/admin/users/page.tsx` | 1 | foundation | Phase 6-7 |
| `src/app/dashboard/alerts/page.tsx` | 166 | copy, dense-data | Phase 1-3 |
| `src/app/dashboard/customers/[id]/page.tsx` | 88 | copy, detail | Phase 1-3 |
| `src/app/dashboard/customers/page.tsx` | 243 | dense-data, overlay, forms | Phase 4 |
| `src/app/dashboard/devices/[id]/page.tsx` | 119 | copy, detail | Phase 1-3 |
| `src/app/dashboard/devices/page.tsx` | 134 | copy, tabs, dense-data | Phase 1-3 |
| `src/app/dashboard/drivers/page.tsx` | 156 | copy, dense-data | Phase 1-3 |
| `src/app/dashboard/exports/page.tsx` | 285 | copy, dense-data, overlay, forms | Phase 1-3 |
| `src/app/dashboard/firmware/page.tsx` | 213 | dense-data, overlay, forms | Phase 4 |
| `src/app/dashboard/fuel/page.tsx` | 14 | copy | Phase 1-3 |
| `src/app/dashboard/geofences/[id]/page.tsx` | 97 | copy, detail | Phase 1-3 |
| `src/app/dashboard/geofences/page.tsx` | 175 | copy, dense-data | Phase 1-3 |
| `src/app/dashboard/layout.tsx` | 47 | foundation | Phase 6-7 |
| `src/app/dashboard/maintenance/[id]/page.tsx` | 96 | copy, detail | Phase 1-3 |
| `src/app/dashboard/maintenance/page.tsx` | 138 | copy, tabs, dense-data | Phase 1-3 |
| `src/app/dashboard/map/page.tsx` | 31 | copy, viewport, mobile-width, mobile-height, visual | Phase 1-3 |
| `src/app/dashboard/notifications/page.tsx` | 54 | copy | Phase 1-3 |
| `src/app/dashboard/page.tsx` | 49 | copy | Phase 1-3 |
| `src/app/dashboard/settings/page.tsx` | 92 | tabs | Phase 5 |
| `src/app/dashboard/simulator/page.tsx` | 76 | copy | Phase 1-3 |
| `src/app/dashboard/statistics/page.tsx` | 14 | copy | Phase 1-3 |
| `src/app/dashboard/system-admin/page.tsx` | 51 | copy, tabs | Phase 1-3 |
| `src/app/dashboard/system-status/page.tsx` | 70 | copy | Phase 1-3 |
| `src/app/dashboard/trips/[id]/page.tsx` | 142 | copy, mobile-width, forms, detail | Phase 1-3 |
| `src/app/dashboard/trips/page.tsx` | 141 | copy, dense-data | Phase 1-3 |
| `src/app/dashboard/users/page.tsx` | 306 | dense-data, overlay, forms | Phase 4 |
| `src/app/dashboard/vehicles/[id]/page.tsx` | 96 | copy, detail | Phase 1-3 |
| `src/app/dashboard/vehicles/page.tsx` | 152 | dense-data | Phase 4 |
| `src/app/dashboard/violations/page.tsx` | 141 | copy, dense-data | Phase 1-3 |

## app/root

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/app/error.tsx` | 18 | copy, mobile-height | Phase 1-3 |
| `src/app/global-error.tsx` | 22 | copy, viewport | Phase 1-3 |
| `src/app/globals.css` | 121 | foundation | Phase 8/Verify |
| `src/app/layout.tsx` | 35 | copy | Phase 1-3 |
| `src/app/login/page.tsx` | 9 | viewport | Phase 1-3 |
| `src/app/not-found.tsx` | 14 | viewport | Phase 1-3 |
| `src/app/page.tsx` | 11 | copy | Phase 1-3 |
| `src/app/theme.css` | 88 | foundation | Phase 8/Verify |

## components/auth

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/components/auth/session-guard.tsx` | 59 | viewport | Phase 8/Verify |

## components/common

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/components/common/confirm-dialog.tsx` | 62 | overlay | Phase 4 |
| `src/components/common/connection-banner.tsx` | 23 | foundation | Phase 8/Verify |
| `src/components/common/data-table.tsx` | 199 | dense-data, forms | Phase 4 |
| `src/components/common/data-table-column-header.tsx` | 36 | dense-data | Phase 4 |
| `src/components/common/empty-state.tsx` | 30 | foundation | Phase 8/Verify |
| `src/components/common/stat-card.tsx` | 69 | mobile-height | Phase 5 |

## components/kbar

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/components/kbar/index.tsx` | 68 | mobile-width, mobile-height | Phase 5 |
| `src/components/kbar/kbar-content.tsx` | 18 | foundation | Phase 8/Verify |
| `src/components/kbar/result-item.tsx` | 34 | foundation | Phase 8/Verify |
| `src/components/kbar/use-theme-switching.tsx` | 31 | foundation | Phase 8/Verify |

## components/layout

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/components/layout/AppSidebar.tsx` | 117 | foundation | Phase 8/Verify |
| `src/components/layout/notification-bell.tsx` | 5 | foundation | Phase 8/Verify |
| `src/components/layout/PageContainer.tsx` | 55 | viewport, mobile-width, mobile-height | Phase 1-3 |

## components/map

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/components/map/geofence-layer.tsx` | 1 | visual | Phase 6-7 |
| `src/components/map/map-sidebar.tsx` | 1 | visual | Phase 6-7 |
| `src/components/map/map-view.tsx` | 1 | visual | Phase 6-7 |
| `src/components/map/vehicle-marker.tsx` | 1 | visual | Phase 6-7 |

## components/providers

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/components/providers/providers.tsx` | 30 | foundation | Phase 8/Verify |
| `src/components/providers/query-provider.tsx` | 14 | foundation | Phase 8/Verify |
| `src/components/providers/realtime-provider.tsx` | 5 | foundation | Phase 8/Verify |
| `src/components/providers/socket-provider.tsx` | 83 | foundation | Phase 8/Verify |

## components/root

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/components/active-theme.tsx` | 46 | foundation | Phase 8/Verify |
| `src/components/breadcrumbs.tsx` | 37 | foundation | Phase 8/Verify |
| `src/components/mode-toggle.tsx` | 29 | foundation | Phase 8/Verify |
| `src/components/nav-user.tsx` | 107 | foundation | Phase 8/Verify |
| `src/components/theme-selector.tsx` | 73 | mobile-width, forms | Phase 4 |

## components/ui

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/components/ui/alert.tsx` | 54 | foundation | Phase 8/Verify |
| `src/components/ui/alert-dialog.tsx` | 166 | mobile-width, overlay | Phase 4 |
| `src/components/ui/avatar.tsx` | 90 | foundation | Phase 8/Verify |
| `src/components/ui/badge.tsx` | 44 | foundation | Phase 8/Verify |
| `src/components/ui/breadcrumb.tsx` | 92 | copy | Phase 1-3 |
| `src/components/ui/button.tsx` | 57 | foundation | Phase 8/Verify |
| `src/components/ui/calendar.tsx` | 170 | visual | Phase 8/Verify |
| `src/components/ui/card.tsx` | 66 | foundation | Phase 8/Verify |
| `src/components/ui/checkbox.tsx` | 25 | foundation | Phase 8/Verify |
| `src/components/ui/collapsible.tsx` | 16 | foundation | Phase 8/Verify |
| `src/components/ui/command.tsx` | 155 | copy, mobile-height, overlay | Phase 1-3 |
| `src/components/ui/dialog.tsx` | 134 | copy, mobile-width, overlay | Phase 1-3 |
| `src/components/ui/dropdown-menu.tsx` | 212 | mobile-width | Phase 5 |
| `src/components/ui/form.tsx` | 128 | foundation | Phase 8/Verify |
| `src/components/ui/input.tsx` | 18 | forms | Phase 4 |
| `src/components/ui/label.tsx` | 17 | foundation | Phase 8/Verify |
| `src/components/ui/popover.tsx` | 64 | overlay | Phase 4 |
| `src/components/ui/progress.tsx` | 24 | foundation | Phase 8/Verify |
| `src/components/ui/radio-group.tsx` | 40 | foundation | Phase 8/Verify |
| `src/components/ui/scroll-area.tsx` | 51 | foundation | Phase 8/Verify |
| `src/components/ui/select.tsx` | 165 | mobile-width, mobile-height, forms | Phase 4 |
| `src/components/ui/separator.tsx` | 24 | foundation | Phase 8/Verify |
| `src/components/ui/sheet.tsx` | 121 | copy, overlay, detail | Phase 1-3 |
| `src/components/ui/sidebar.tsx` | 644 | copy, mobile-width, overlay, forms | Phase 1-3 |
| `src/components/ui/skeleton.tsx` | 11 | foundation | Phase 8/Verify |
| `src/components/ui/slider.tsx` | 53 | foundation | Phase 8/Verify |
| `src/components/ui/switch.tsx` | 31 | mobile-height | Phase 5 |
| `src/components/ui/table.tsx` | 81 | dense-data | Phase 4 |
| `src/components/ui/tabs.tsx` | 79 | mobile-height, tabs | Phase 5 |
| `src/components/ui/textarea.tsx` | 15 | forms | Phase 4 |
| `src/components/ui/tooltip.tsx` | 46 | foundation | Phase 8/Verify |

## features/admin

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/features/admin/components/system-settings-editor.tsx` | 6 | dense-data | Phase 4 |
| `src/features/admin/components/vl-log-viewer.tsx` | 16 | mobile-height, forms | Phase 4 |
| `src/features/admin/components/vm-query-viewer.tsx` | 22 | mobile-height, forms | Phase 4 |

## features/alerts

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/features/alerts/components/alert-columns.tsx` | 72 | copy, dense-data | Phase 4 |
| `src/features/alerts/components/alert-detail-modal.tsx` | 74 | copy, mobile-height, overlay, detail | Phase 4 |
| `src/features/alerts/components/alert-filters.tsx` | 51 | copy, forms | Phase 4 |

## features/auth

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/features/auth/components/login-form.tsx` | 122 | forms | Phase 4 |
| `src/features/auth/components/logout-button.tsx` | 23 | verify | Phase 8/Verify |

## features/dashboard

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/features/dashboard/components/activity-feed.tsx` | 55 | copy, mobile-height | Phase 5 |
| `src/features/dashboard/components/alerts-severity-chart.tsx` | 26 | mobile-height, visual | Phase 5 |
| `src/features/dashboard/components/area-graph.tsx` | 55 | copy, mobile-height | Phase 5 |
| `src/features/dashboard/components/bar-graph.tsx` | 37 | mobile-height | Phase 5 |
| `src/features/dashboard/components/device-status-chart.tsx` | 31 | mobile-height, visual | Phase 5 |
| `src/features/dashboard/components/overview-stats.tsx` | 82 | copy | Phase 6-7 |
| `src/features/dashboard/components/pie-graph.tsx` | 31 | mobile-height | Phase 5 |
| `src/features/dashboard/components/quick-actions.tsx` | 34 | copy | Phase 6-7 |
| `src/features/dashboard/components/recent-alerts.tsx` | 69 | copy | Phase 6-7 |
| `src/features/dashboard/components/stat-cards.tsx` | 33 | verify | Phase 6-7 |
| `src/features/dashboard/components/vehicle-activity-chart.tsx` | 29 | mobile-height, visual | Phase 5 |
| `src/features/dashboard/hooks/use-dashboard-realtime.ts` | 25 | verify | Phase 6-7 |
| `src/features/dashboard/hooks/use-dashboard-stats.ts` | 234 | copy | Phase 6-7 |

## features/devices

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/features/devices/components/device-card.tsx` | 72 | copy | Phase 6-7 |
| `src/features/devices/components/device-columns.tsx` | 80 | copy, dense-data | Phase 4 |
| `src/features/devices/components/device-commands-tab.tsx` | 2 | verify | Phase 6-7 |
| `src/features/devices/components/device-constants.ts` | 24 | copy | Phase 6-7 |
| `src/features/devices/components/device-create-modal.tsx` | 10 | detail | Phase 6-7 |
| `src/features/devices/components/device-design-constants.ts` | 12 | mobile-width | Phase 5 |
| `src/features/devices/components/device-detail-modal.tsx` | 2 | detail | Phase 6-7 |
| `src/features/devices/components/device-detail-modal/empty-state.tsx` | 16 | detail | Phase 6-7 |
| `src/features/devices/components/device-detail-modal/error-codes-tab.tsx` | 146 | copy, mobile-width, dense-data, forms, detail | Phase 4 |
| `src/features/devices/components/device-detail-modal/index.tsx` | 140 | copy, mobile-width, mobile-height, tabs, overlay, detail | Phase 4 |
| `src/features/devices/components/device-detail-modal/modal-container.tsx` | 157 | copy, detail | Phase 6-7 |
| `src/features/devices/components/device-detail-modal/modal-context.tsx` | 68 | detail | Phase 6-7 |
| `src/features/devices/components/device-detail-modal/overview-tab.tsx` | 85 | copy, detail | Phase 6-7 |
| `src/features/devices/components/device-detail-modal/runtime-tab.tsx` | 29 | copy, detail | Phase 6-7 |
| `src/features/devices/components/device-detail-modal/sessions-tab.tsx` | 74 | copy, detail | Phase 6-7 |
| `src/features/devices/components/device-detail-modal/session-vibration-chart-dialog.tsx` | 39 | mobile-height, overlay, detail, visual | Phase 4 |
| `src/features/devices/components/device-detail-modal/settings-tab.tsx` | 126 | copy, forms, detail | Phase 4 |
| `src/features/devices/components/device-detail-modal/vibration-tab.tsx` | 30 | copy, detail | Phase 6-7 |
| `src/features/devices/components/device-detail-sheet.tsx` | 14 | detail | Phase 6-7 |
| `src/features/devices/components/device-edit-modal.tsx` | 13 | detail | Phase 6-7 |
| `src/features/devices/components/device-filters.tsx` | 76 | copy, mobile-width, forms | Phase 4 |
| `src/features/devices/components/device-form.tsx` | 180 | copy, overlay, forms | Phase 4 |
| `src/features/devices/components/device-grid.tsx` | 17 | verify | Phase 6-7 |
| `src/features/devices/components/device-runtime-chart.tsx` | 24 | copy, mobile-height, visual | Phase 5 |
| `src/features/devices/components/device-session-table.tsx` | 2 | verify | Phase 6-7 |
| `src/features/devices/components/device-skeletons.tsx` | 23 | verify | Phase 6-7 |
| `src/features/devices/components/device-stats-bar.tsx` | 37 | copy | Phase 6-7 |
| `src/features/devices/components/device-telemetry-tab.tsx` | 2 | verify | Phase 6-7 |
| `src/features/devices/components/device-utils.ts` | 16 | verify | Phase 6-7 |
| `src/features/devices/components/device-vibration-chart.tsx` | 37 | copy, mobile-height, visual | Phase 5 |
| `src/features/devices/components/error-box.tsx` | 17 | copy | Phase 6-7 |
| `src/features/devices/components/export-modal.tsx` | 113 | copy, overlay, forms, detail | Phase 4 |
| `src/features/devices/components/index.ts` | 21 | verify | Phase 6-7 |
| `src/features/devices/components/mobile-device-content.tsx` | 15 | verify | Phase 6-7 |
| `src/features/devices/components/mobile-device-header.tsx` | 13 | copy | Phase 6-7 |
| `src/features/devices/components/mobile-tab-selector.tsx` | 10 | tabs | Phase 5 |
| `src/features/devices/components/stat-card.tsx` | 12 | verify | Phase 6-7 |
| `src/features/devices/hooks/use-create-device.ts` | 22 | copy | Phase 6-7 |
| `src/features/devices/hooks/use-delete-device.ts` | 22 | copy | Phase 6-7 |
| `src/features/devices/hooks/use-device-detail.ts` | 50 | detail | Phase 6-7 |
| `src/features/devices/hooks/use-device-error-codes.ts` | 80 | verify | Phase 6-7 |
| `src/features/devices/hooks/use-device-realtime.ts` | 19 | verify | Phase 6-7 |
| `src/features/devices/hooks/use-device-runtime-chart.ts` | 45 | visual | Phase 6-7 |
| `src/features/devices/hooks/use-devices.ts` | 62 | verify | Phase 6-7 |
| `src/features/devices/hooks/use-device-sessions.ts` | 83 | verify | Phase 6-7 |
| `src/features/devices/hooks/use-device-vibration-chart.ts` | 50 | visual | Phase 6-7 |
| `src/features/devices/hooks/use-send-command.ts` | 23 | copy | Phase 6-7 |
| `src/features/devices/hooks/use-update-device.ts` | 23 | copy | Phase 6-7 |
| `src/features/devices/hooks/use-update-device-settings.ts` | 24 | copy | Phase 6-7 |
| `src/features/devices/types/index.ts` | 42 | verify | Phase 6-7 |

## features/drivers

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/features/drivers/components/driver-columns.tsx` | 55 | copy, dense-data | Phase 4 |
| `src/features/drivers/components/driver-form.tsx` | 216 | copy, mobile-height, overlay, forms | Phase 4 |
| `src/features/drivers/types/index.ts` | 31 | verify | Phase 8/Verify |

## features/fuel-analytics

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/features/fuel-analytics/components/fuel-analytics-page.tsx` | 39 | verify | Phase 8/Verify |
| `src/features/fuel-analytics/components/fuel-by-vehicle-chart.tsx` | 63 | copy, mobile-height, visual | Phase 5 |
| `src/features/fuel-analytics/components/fuel-date-filter.tsx` | 68 | copy, mobile-width, forms | Phase 4 |
| `src/features/fuel-analytics/components/fuel-summary-cards.tsx` | 50 | copy | Phase 8/Verify |
| `src/features/fuel-analytics/components/fuel-trends-chart.tsx` | 84 | copy, mobile-height, visual | Phase 5 |
| `src/features/fuel-analytics/hooks/use-fuel-analytics.ts` | 75 | verify | Phase 8/Verify |
| `src/features/fuel-analytics/types/index.ts` | 26 | verify | Phase 8/Verify |

## features/geofences

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/features/geofences/components/geofence-columns.tsx` | 54 | dense-data | Phase 4 |
| `src/features/geofences/components/geofence-form.tsx` | 105 | overlay, forms | Phase 4 |
| `src/features/geofences/components/geofence-map-editor.tsx` | 25 | mobile-height, visual | Phase 5 |
| `src/features/geofences/components/geofence-vehicle-binder.tsx` | 31 | verify | Phase 8/Verify |
| `src/features/geofences/hooks/use-geofences.ts` | 7 | verify | Phase 8/Verify |

## features/maintenance

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/features/maintenance/components/maintenance-calendar.tsx` | 44 | copy, visual | Phase 6-7 |
| `src/features/maintenance/components/mileage-forecaster.tsx` | 28 | mobile-height | Phase 5 |

## features/map

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/features/map/components/device-cluster.tsx` | 24 | visual | Phase 6-7 |
| `src/features/map/components/device-filter.tsx` | 31 | copy, forms, visual | Phase 4 |
| `src/features/map/components/device-filter-compact.tsx` | 46 | copy, visual | Phase 6-7 |
| `src/features/map/components/device-list-item.tsx` | 31 | copy, visual | Phase 6-7 |
| `src/features/map/components/device-list-panel.tsx` | 66 | copy, viewport, mobile-width, mobile-height, visual | Phase 5 |
| `src/features/map/components/device-marker.tsx` | 32 | copy, visual | Phase 6-7 |
| `src/features/map/components/device-search.tsx` | 22 | copy, forms, visual | Phase 4 |
| `src/features/map/components/geofence-layer.tsx` | 23 | visual | Phase 6-7 |
| `src/features/map/components/index.ts` | 12 | visual | Phase 6-7 |
| `src/features/map/components/map-controls.tsx` | 115 | copy, visual | Phase 6-7 |
| `src/features/map/components/map-layer-switcher.tsx` | 30 | copy, visual | Phase 6-7 |
| `src/features/map/components/map-sidebar.tsx` | 80 | copy, mobile-height, tabs, forms, visual | Phase 4 |
| `src/features/map/components/map-toolbar.tsx` | 19 | visual | Phase 6-7 |
| `src/features/map/components/map-view.tsx` | 36 | visual | Phase 6-7 |
| `src/features/map/components/marker-icon.ts` | 20 | visual | Phase 6-7 |
| `src/features/map/components/mobile-device-drawer.tsx` | 86 | copy, mobile-height, overlay, visual | Phase 4 |
| `src/features/map/components/selected-device-card.tsx` | 37 | copy, visual | Phase 6-7 |
| `src/features/map/components/tracking-map.tsx` | 90 | mobile-width, visual | Phase 5 |
| `src/features/map/components/vehicle-marker.tsx` | 39 | visual | Phase 6-7 |
| `src/features/map/constants/map-config.ts` | 37 | copy, visual | Phase 6-7 |
| `src/features/map/hooks/use-device-positions.ts` | 39 | visual | Phase 6-7 |
| `src/features/map/hooks/use-map-realtime.ts` | 54 | visual | Phase 6-7 |
| `src/features/map/store/map-store.ts` | 57 | visual | Phase 6-7 |
| `src/features/map/types/index.ts` | 20 | visual | Phase 6-7 |

## features/marketing

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/features/marketing/components/landing-architecture.tsx` | 72 | copy, mobile-width | Phase 5 |
| `src/features/marketing/components/landing-feature-grid.tsx` | 44 | copy | Phase 6-7 |
| `src/features/marketing/components/landing-header.tsx` | 53 | copy, mobile-width | Phase 5 |
| `src/features/marketing/components/landing-hero.tsx` | 113 | copy, mobile-width | Phase 5 |
| `src/features/marketing/components/landing-page.tsx` | 51 | copy, viewport | Phase 6-7 |
| `src/features/marketing/components/landing-proof.tsx` | 80 | copy | Phase 6-7 |
| `src/features/marketing/components/marketing-section-heading.tsx` | 31 | verify | Phase 6-7 |
| `src/features/marketing/data/landing-content.ts` | 117 | copy | Phase 6-7 |

## features/notifications

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/features/notifications/components/notification-badge.tsx` | 25 | verify | Phase 6-7 |
| `src/features/notifications/components/notification-center.tsx` | 7 | verify | Phase 6-7 |
| `src/features/notifications/components/notification-dropdown.tsx` | 73 | mobile-width, mobile-height, overlay | Phase 4 |
| `src/features/notifications/components/notification-filters.tsx` | 95 | copy, mobile-width, forms | Phase 4 |
| `src/features/notifications/components/notification-item.tsx` | 26 | copy | Phase 6-7 |
| `src/features/notifications/components/notification-list.tsx` | 103 | copy | Phase 6-7 |
| `src/features/notifications/components/notification-stats.tsx` | 23 | copy | Phase 6-7 |
| `src/features/notifications/hooks/use-mark-all-read.ts` | 19 | copy | Phase 6-7 |
| `src/features/notifications/hooks/use-notifications.ts` | 8 | verify | Phase 6-7 |
| `src/features/notifications/hooks/use-realtime-events.ts` | 73 | copy | Phase 6-7 |
| `src/features/notifications/hooks/use-unread-count.ts` | 12 | verify | Phase 6-7 |
| `src/features/notifications/types/index.ts` | 10 | verify | Phase 6-7 |

## features/settings

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/features/settings/components/notification-prefs.tsx` | 31 | verify | Phase 8/Verify |
| `src/features/settings/components/password-form.tsx` | 47 | forms | Phase 4 |
| `src/features/settings/components/profile-form.tsx` | 29 | forms | Phase 4 |
| `src/features/settings/components/theme-selector.tsx` | 2 | verify | Phase 8/Verify |

## features/simulator

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/features/simulator/components/data-configurator.tsx` | 88 | forms | Phase 4 |
| `src/features/simulator/components/device-selector.tsx` | 69 | copy, mobile-height, forms | Phase 4 |
| `src/features/simulator/components/simulation-controls.tsx` | 103 | copy, forms | Phase 4 |
| `src/features/simulator/components/simulation-preview.tsx` | 48 | copy, mobile-height, visual | Phase 5 |
| `src/features/simulator/hooks/use-simulator.ts` | 240 | copy | Phase 8/Verify |

## features/statistics

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/features/statistics/components/device-uptime-chart.tsx` | 65 | copy, mobile-height, visual | Phase 5 |
| `src/features/statistics/components/fleet-utilization-chart.tsx` | 47 | copy, mobile-height, visual | Phase 5 |
| `src/features/statistics/components/statistics-overview.tsx` | 138 | copy, mobile-width, forms | Phase 4 |
| `src/features/statistics/hooks/use-statistics.ts` | 94 | verify | Phase 8/Verify |

## features/system-admin

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/features/system-admin/components/chart-views/line-chart-view.tsx` | 58 | mobile-height, visual | Phase 5 |
| `src/features/system-admin/components/chart-views/table-view.tsx` | 52 | copy, mobile-height, dense-data, visual | Phase 4 |
| `src/features/system-admin/components/data-table/column-header.tsx` | 32 | dense-data | Phase 4 |
| `src/features/system-admin/components/data-table/data-table.tsx` | 121 | copy, dense-data | Phase 4 |
| `src/features/system-admin/components/data-table/pagination.tsx` | 36 | copy, dense-data | Phase 4 |
| `src/features/system-admin/components/data-table/toolbar.tsx` | 39 | copy, mobile-width, dense-data, forms | Phase 4 |
| `src/features/system-admin/components/logs-filter.tsx` | 62 | copy, mobile-width, forms | Phase 4 |
| `src/features/system-admin/components/logs-viewer.tsx` | 73 | copy, mobile-width, dense-data | Phase 4 |
| `src/features/system-admin/components/metrics-explorer.tsx` | 97 | copy, mobile-width, mobile-height, dense-data, forms | Phase 4 |
| `src/features/system-admin/components/query-builder.tsx` | 214 | copy, forms | Phase 4 |
| `src/features/system-admin/components/query-results-table.tsx` | 46 | copy, mobile-width, dense-data | Phase 4 |
| `src/features/system-admin/constants.ts` | 18 | copy | Phase 8/Verify |
| `src/features/system-admin/hooks/use-system-admin.ts` | 210 | verify | Phase 8/Verify |
| `src/features/system-admin/types.ts` | 45 | verify | Phase 8/Verify |

## features/system-status

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/features/system-status/components/health-card.tsx` | 19 | copy | Phase 8/Verify |
| `src/features/system-status/components/metric-card.tsx` | 26 | verify | Phase 8/Verify |
| `src/features/system-status/components/status-badge.tsx` | 12 | copy | Phase 8/Verify |
| `src/features/system-status/components/status-progress.tsx` | 11 | verify | Phase 8/Verify |
| `src/features/system-status/hooks/use-system-status.ts` | 81 | verify | Phase 8/Verify |

## features/trips

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/features/trips/components/trip-columns.tsx` | 55 | copy, dense-data | Phase 4 |
| `src/features/trips/components/trip-detail.tsx` | 50 | mobile-height, detail | Phase 5 |
| `src/features/trips/components/trip-form.tsx` | 85 | copy, overlay, forms | Phase 4 |
| `src/features/trips/components/trip-replay-controls.tsx` | 57 | forms | Phase 4 |
| `src/features/trips/hooks/use-trip-live-tracking.ts` | 20 | verify | Phase 6-7 |

## features/vehicles

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/features/vehicles/components/vehicle-assign-device.tsx` | 60 | overlay, forms | Phase 4 |
| `src/features/vehicles/components/vehicle-columns.tsx` | 51 | copy, dense-data | Phase 4 |
| `src/features/vehicles/components/vehicle-detail-modal.tsx` | 45 | copy, tabs, overlay, detail | Phase 4 |
| `src/features/vehicles/components/vehicle-form.tsx` | 88 | copy, overlay, forms | Phase 4 |

## src/config

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/config/nav-config.ts` | 68 | verify | Phase 8/Verify |

## src/hooks

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/hooks/mutations/use-create-export.ts` | 28 | copy | Phase 8/Verify |
| `src/hooks/use-breadcrumbs.tsx` | 91 | verify | Phase 8/Verify |
| `src/hooks/use-device-status-realtime.ts` | 92 | verify | Phase 8/Verify |
| `src/hooks/use-media-query.ts` | 14 | verify | Phase 8/Verify |
| `src/hooks/use-mobile.ts` | 15 | verify | Phase 8/Verify |
| `src/hooks/use-nav.ts` | 48 | verify | Phase 8/Verify |
| `src/hooks/use-realtime-subscription.ts` | 29 | verify | Phase 8/Verify |
| `src/hooks/use-role-access.ts` | 31 | verify | Phase 8/Verify |

## src/lib

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/lib/api/alerts.ts` | 14 | verify | Phase 8/Verify |
| `src/lib/api/auth.ts` | 34 | verify | Phase 8/Verify |
| `src/lib/api/client.ts` | 69 | verify | Phase 8/Verify |
| `src/lib/api/customers.ts` | 11 | verify | Phase 8/Verify |
| `src/lib/api/dashboard.ts` | 15 | verify | Phase 6-7 |
| `src/lib/api/device-detail.ts` | 80 | detail | Phase 6-7 |
| `src/lib/api/devices.ts` | 31 | verify | Phase 6-7 |
| `src/lib/api/drivers.ts` | 13 | verify | Phase 8/Verify |
| `src/lib/api/export.ts` | 59 | verify | Phase 8/Verify |
| `src/lib/api/exports.ts` | 1 | verify | Phase 8/Verify |
| `src/lib/api/firmware.ts` | 15 | verify | Phase 8/Verify |
| `src/lib/api/geofences.ts` | 13 | verify | Phase 8/Verify |
| `src/lib/api/maintenance.ts` | 11 | verify | Phase 6-7 |
| `src/lib/api/map.ts` | 4 | visual | Phase 6-7 |
| `src/lib/api/notifications.ts` | 10 | verify | Phase 6-7 |
| `src/lib/api/simulator.ts` | 22 | verify | Phase 8/Verify |
| `src/lib/api/statistics.ts` | 11 | verify | Phase 8/Verify |
| `src/lib/api/system-admin.ts` | 18 | verify | Phase 8/Verify |
| `src/lib/api/system-status.ts` | 5 | verify | Phase 8/Verify |
| `src/lib/api/trips.ts` | 15 | verify | Phase 6-7 |
| `src/lib/api/users.ts` | 30 | verify | Phase 8/Verify |
| `src/lib/api/vehicles.ts` | 13 | verify | Phase 6-7 |
| `src/lib/api/violations.ts` | 11 | verify | Phase 8/Verify |
| `src/lib/notification.ts` | 14 | verify | Phase 8/Verify |
| `src/lib/store/map-store.ts` | 1 | visual | Phase 6-7 |
| `src/lib/stores/auth-store.ts` | 28 | verify | Phase 8/Verify |
| `src/lib/stores/map-store.ts` | 1 | visual | Phase 6-7 |
| `src/lib/utils.ts` | 5 | verify | Phase 8/Verify |
| `src/lib/utils/browser-notification.ts` | 55 | copy | Phase 8/Verify |
| `src/lib/utils/date/format.ts` | 57 | verify | Phase 8/Verify |
| `src/lib/utils/logger.ts` | 14 | verify | Phase 8/Verify |
| `src/lib/utils/query-invalidation.ts` | 65 | verify | Phase 8/Verify |
| `src/lib/validations/alert.schema.ts` | 12 | verify | Phase 8/Verify |
| `src/lib/validations/auth.schema.ts` | 7 | verify | Phase 8/Verify |
| `src/lib/validations/customer.schema.ts` | 11 | verify | Phase 8/Verify |
| `src/lib/validations/device.schema.ts` | 15 | verify | Phase 8/Verify |
| `src/lib/validations/export.schema.ts` | 12 | verify | Phase 8/Verify |
| `src/lib/validations/firmware.schema.ts` | 12 | verify | Phase 8/Verify |
| `src/lib/validations/geofence.schema.ts` | 9 | verify | Phase 8/Verify |
| `src/lib/validations/maintenance.schema.ts` | 10 | verify | Phase 6-7 |
| `src/lib/validations/settings.schema.ts` | 20 | verify | Phase 8/Verify |
| `src/lib/validations/trip.schema.ts` | 10 | verify | Phase 8/Verify |
| `src/lib/validations/user.schema.ts` | 9 | verify | Phase 8/Verify |
| `src/lib/validations/vehicle.schema.ts` | 18 | verify | Phase 8/Verify |

## src/types

| File | Lines | Focus | Suggested Phase |
| --- | ---: | --- | --- |
| `src/types/index.ts` | 25 | verify | Phase 8/Verify |

