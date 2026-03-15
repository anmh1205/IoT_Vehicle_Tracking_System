# File-by-File Frontend UI/UX Audit

- Scope: all `src/**/*.tsx|ts|css` files
- Total files reviewed: 324
- Legend: `mojibake`, `viewport`, `fixed-width`, `fixed-height`, `tabs`, `table`, `overlay`, `input`, `button`

## app

| File | Role | Lines | Flags |
| --- | --- | ---: | --- |
| `src\app\dashboard\admin\system\page.tsx` | route/shell | 1 | none |
| `src\app\dashboard\admin\system-status\page.tsx` | route/shell | 1 | none |
| `src\app\dashboard\admin\users\page.tsx` | route/shell | 1 | none |
| `src\app\dashboard\alerts\page.tsx` | route/shell | 166 | mojibake, table, button |
| `src\app\dashboard\customers\[id]\page.tsx` | route/shell | 88 | mojibake |
| `src\app\dashboard\customers\page.tsx` | route/shell | 243 | table, overlay, input, button |
| `src\app\dashboard\devices\[id]\page.tsx` | route/shell | 119 | mojibake |
| `src\app\dashboard\devices\page.tsx` | route/shell | 134 | mojibake, tabs, table, button |
| `src\app\dashboard\drivers\page.tsx` | route/shell | 156 | mojibake, table, button |
| `src\app\dashboard\exports\page.tsx` | route/shell | 285 | mojibake, table, overlay, input, button |
| `src\app\dashboard\firmware\page.tsx` | route/shell | 213 | table, overlay, input, button |
| `src\app\dashboard\fuel\page.tsx` | route/shell | 14 | mojibake |
| `src\app\dashboard\geofences\[id]\page.tsx` | route/shell | 97 | mojibake |
| `src\app\dashboard\geofences\page.tsx` | route/shell | 175 | mojibake, table, button |
| `src\app\dashboard\layout.tsx` | route/shell | 47 | none |
| `src\app\dashboard\maintenance\[id]\page.tsx` | route/shell | 96 | mojibake |
| `src\app\dashboard\maintenance\page.tsx` | route/shell | 138 | mojibake, tabs, table, button |
| `src\app\dashboard\map\page.tsx` | route/shell | 31 | mojibake, viewport, fixed-width, fixed-height |
| `src\app\dashboard\notifications\page.tsx` | route/shell | 54 | mojibake, button |
| `src\app\dashboard\page.tsx` | route/shell | 49 | mojibake |
| `src\app\dashboard\settings\page.tsx` | route/shell | 92 | tabs, button |
| `src\app\dashboard\simulator\page.tsx` | route/shell | 76 | mojibake |
| `src\app\dashboard\statistics\page.tsx` | route/shell | 14 | mojibake |
| `src\app\dashboard\system-admin\page.tsx` | route/shell | 51 | mojibake, tabs, button |
| `src\app\dashboard\system-status\page.tsx` | route/shell | 70 | mojibake |
| `src\app\dashboard\trips\[id]\page.tsx` | route/shell | 142 | mojibake, fixed-width, input |
| `src\app\dashboard\trips\page.tsx` | route/shell | 141 | mojibake, table, button |
| `src\app\dashboard\users\page.tsx` | route/shell | 306 | table, overlay, input, button |
| `src\app\dashboard\vehicles\[id]\page.tsx` | route/shell | 96 | mojibake |
| `src\app\dashboard\vehicles\page.tsx` | route/shell | 152 | table, button |
| `src\app\dashboard\violations\page.tsx` | route/shell | 141 | mojibake, table, button |
| `src\app\error.tsx` | route/shell | 18 | mojibake, fixed-height, button |
| `src\app\global-error.tsx` | route/shell | 22 | mojibake, viewport, button |
| `src\app\globals.css` | route/shell | 121 | none |
| `src\app\layout.tsx` | route/shell | 35 | mojibake |
| `src\app\login\page.tsx` | route/shell | 9 | viewport |
| `src\app\not-found.tsx` | route/shell | 14 | viewport, button |
| `src\app\page.tsx` | route/shell | 11 | mojibake |
| `src\app\theme.css` | route/shell | 88 | none |

## components

| File | Role | Lines | Flags |
| --- | --- | ---: | --- |
| `src\components\active-theme.tsx` | shared-surface | 46 | none |
| `src\components\auth\session-guard.tsx` | shared-surface | 59 | viewport |
| `src\components\breadcrumbs.tsx` | shared-surface | 37 | none |
| `src\components\common\confirm-dialog.tsx` | shared-surface | 62 | overlay |
| `src\components\common\connection-banner.tsx` | shared-surface | 23 | none |
| `src\components\common\data-table.tsx` | shared-surface | 199 | table, input, button |
| `src\components\common\data-table-column-header.tsx` | shared-surface | 36 | table, button |
| `src\components\common\empty-state.tsx` | shared-surface | 30 | button |
| `src\components\common\stat-card.tsx` | shared-surface | 69 | fixed-height |
| `src\components\kbar\index.tsx` | shared-surface | 68 | fixed-width, fixed-height |
| `src\components\kbar\kbar-content.tsx` | shared-surface | 18 | none |
| `src\components\kbar\result-item.tsx` | shared-surface | 34 | none |
| `src\components\kbar\use-theme-switching.tsx` | shared-surface | 31 | none |
| `src\components\layout\AppSidebar.tsx` | shared-surface | 117 | button |
| `src\components\layout\notification-bell.tsx` | shared-surface | 5 | none |
| `src\components\layout\PageContainer.tsx` | shared-surface | 55 | viewport, fixed-width, fixed-height |
| `src\components\map\geofence-layer.tsx` | shared-surface | 1 | none |
| `src\components\map\map-sidebar.tsx` | shared-surface | 1 | none |
| `src\components\map\map-view.tsx` | shared-surface | 1 | none |
| `src\components\map\vehicle-marker.tsx` | shared-surface | 1 | none |
| `src\components\mode-toggle.tsx` | shared-surface | 29 | button |
| `src\components\nav-user.tsx` | shared-surface | 107 | button |
| `src\components\providers\providers.tsx` | shared-surface | 30 | none |
| `src\components\providers\query-provider.tsx` | shared-surface | 14 | none |
| `src\components\providers\realtime-provider.tsx` | shared-surface | 5 | none |
| `src\components\providers\socket-provider.tsx` | shared-surface | 83 | none |
| `src\components\theme-selector.tsx` | shared-surface | 73 | fixed-width, input |
| `src\components\ui\alert.tsx` | ui-primitive | 54 | none |
| `src\components\ui\alert-dialog.tsx` | ui-primitive | 166 | fixed-width, overlay, button |
| `src\components\ui\avatar.tsx` | ui-primitive | 90 | none |
| `src\components\ui\badge.tsx` | ui-primitive | 44 | none |
| `src\components\ui\breadcrumb.tsx` | ui-primitive | 92 | mojibake |
| `src\components\ui\button.tsx` | ui-primitive | 57 | button |
| `src\components\ui\calendar.tsx` | ui-primitive | 170 | button |
| `src\components\ui\card.tsx` | ui-primitive | 66 | none |
| `src\components\ui\checkbox.tsx` | ui-primitive | 25 | none |
| `src\components\ui\collapsible.tsx` | ui-primitive | 16 | none |
| `src\components\ui\command.tsx` | ui-primitive | 155 | mojibake, fixed-height, overlay |
| `src\components\ui\dialog.tsx` | ui-primitive | 134 | mojibake, fixed-width, overlay, button |
| `src\components\ui\dropdown-menu.tsx` | ui-primitive | 212 | fixed-width |
| `src\components\ui\form.tsx` | ui-primitive | 128 | none |
| `src\components\ui\input.tsx` | ui-primitive | 18 | input |
| `src\components\ui\label.tsx` | ui-primitive | 17 | none |
| `src\components\ui\popover.tsx` | ui-primitive | 64 | overlay |
| `src\components\ui\progress.tsx` | ui-primitive | 24 | none |
| `src\components\ui\radio-group.tsx` | ui-primitive | 40 | none |
| `src\components\ui\scroll-area.tsx` | ui-primitive | 51 | none |
| `src\components\ui\select.tsx` | ui-primitive | 165 | fixed-width, fixed-height, input |
| `src\components\ui\separator.tsx` | ui-primitive | 24 | none |
| `src\components\ui\sheet.tsx` | ui-primitive | 121 | mojibake, overlay |
| `src\components\ui\sidebar.tsx` | ui-primitive | 644 | mojibake, fixed-width, overlay, input, button |
| `src\components\ui\skeleton.tsx` | ui-primitive | 11 | none |
| `src\components\ui\slider.tsx` | ui-primitive | 53 | none |
| `src\components\ui\switch.tsx` | ui-primitive | 31 | fixed-height |
| `src\components\ui\table.tsx` | ui-primitive | 81 | table |
| `src\components\ui\tabs.tsx` | ui-primitive | 79 | fixed-height, tabs, button |
| `src\components\ui\textarea.tsx` | ui-primitive | 15 | input |
| `src\components\ui\tooltip.tsx` | ui-primitive | 46 | none |

## config

| File | Role | Lines | Flags |
| --- | --- | ---: | --- |
| `src\config\nav-config.ts` | config-support | 68 | none |

## features

| File | Role | Lines | Flags |
| --- | --- | ---: | --- |
| `src\features\admin\components\system-settings-editor.tsx` | feature-surface | 6 | table |
| `src\features\admin\components\vl-log-viewer.tsx` | feature-surface | 16 | fixed-height, input, button |
| `src\features\admin\components\vm-query-viewer.tsx` | feature-surface | 22 | fixed-height, input, button |
| `src\features\alerts\components\alert-columns.tsx` | feature-surface | 72 | mojibake, table, button |
| `src\features\alerts\components\alert-detail-modal.tsx` | feature-surface | 74 | mojibake, fixed-height, overlay |
| `src\features\alerts\components\alert-filters.tsx` | feature-surface | 51 | mojibake, input |
| `src\features\auth\components\login-form.tsx` | feature-surface | 122 | input, button |
| `src\features\auth\components\logout-button.tsx` | feature-surface | 23 | button |
| `src\features\dashboard\components\activity-feed.tsx` | feature-surface | 55 | mojibake, fixed-height |
| `src\features\dashboard\components\alerts-severity-chart.tsx` | feature-surface | 26 | fixed-height |
| `src\features\dashboard\components\area-graph.tsx` | feature-surface | 55 | mojibake, fixed-height |
| `src\features\dashboard\components\bar-graph.tsx` | feature-surface | 37 | fixed-height |
| `src\features\dashboard\components\device-status-chart.tsx` | feature-surface | 31 | fixed-height |
| `src\features\dashboard\components\overview-stats.tsx` | feature-surface | 82 | mojibake |
| `src\features\dashboard\components\pie-graph.tsx` | feature-surface | 31 | fixed-height |
| `src\features\dashboard\components\quick-actions.tsx` | feature-surface | 34 | mojibake, button |
| `src\features\dashboard\components\recent-alerts.tsx` | feature-surface | 69 | mojibake |
| `src\features\dashboard\components\stat-cards.tsx` | feature-surface | 33 | none |
| `src\features\dashboard\components\vehicle-activity-chart.tsx` | feature-surface | 29 | fixed-height |
| `src\features\dashboard\hooks\use-dashboard-realtime.ts` | feature-support | 25 | none |
| `src\features\dashboard\hooks\use-dashboard-stats.ts` | feature-support | 234 | mojibake |
| `src\features\devices\components\device-card.tsx` | feature-surface | 72 | mojibake |
| `src\features\devices\components\device-columns.tsx` | feature-surface | 80 | mojibake, table, button |
| `src\features\devices\components\device-commands-tab.tsx` | feature-surface | 2 | none |
| `src\features\devices\components\device-constants.ts` | feature-surface | 24 | mojibake |
| `src\features\devices\components\device-create-modal.tsx` | feature-surface | 10 | none |
| `src\features\devices\components\device-design-constants.ts` | feature-surface | 12 | fixed-width |
| `src\features\devices\components\device-detail-modal.tsx` | feature-surface | 2 | none |
| `src\features\devices\components\device-detail-modal\empty-state.tsx` | feature-surface | 16 | none |
| `src\features\devices\components\device-detail-modal\error-codes-tab.tsx` | feature-surface | 146 | mojibake, fixed-width, table, input, button |
| `src\features\devices\components\device-detail-modal\index.tsx` | feature-surface | 140 | mojibake, fixed-width, fixed-height, tabs, overlay, button |
| `src\features\devices\components\device-detail-modal\modal-container.tsx` | feature-surface | 157 | mojibake |
| `src\features\devices\components\device-detail-modal\modal-context.tsx` | feature-surface | 68 | none |
| `src\features\devices\components\device-detail-modal\overview-tab.tsx` | feature-surface | 85 | mojibake |
| `src\features\devices\components\device-detail-modal\runtime-tab.tsx` | feature-surface | 29 | mojibake, button |
| `src\features\devices\components\device-detail-modal\sessions-tab.tsx` | feature-surface | 74 | mojibake, button |
| `src\features\devices\components\device-detail-modal\session-vibration-chart-dialog.tsx` | feature-surface | 39 | fixed-height, overlay |
| `src\features\devices\components\device-detail-modal\settings-tab.tsx` | feature-surface | 126 | mojibake, input, button |
| `src\features\devices\components\device-detail-modal\vibration-tab.tsx` | feature-surface | 30 | mojibake, button |
| `src\features\devices\components\device-detail-sheet.tsx` | feature-surface | 14 | none |
| `src\features\devices\components\device-edit-modal.tsx` | feature-surface | 13 | none |
| `src\features\devices\components\device-filters.tsx` | feature-surface | 76 | mojibake, fixed-width, input |
| `src\features\devices\components\device-form.tsx` | feature-surface | 180 | mojibake, overlay, input, button |
| `src\features\devices\components\device-grid.tsx` | feature-surface | 17 | none |
| `src\features\devices\components\device-runtime-chart.tsx` | feature-surface | 24 | mojibake, fixed-height |
| `src\features\devices\components\device-session-table.tsx` | feature-surface | 2 | none |
| `src\features\devices\components\device-skeletons.tsx` | feature-surface | 23 | none |
| `src\features\devices\components\device-stats-bar.tsx` | feature-surface | 37 | mojibake |
| `src\features\devices\components\device-telemetry-tab.tsx` | feature-surface | 2 | none |
| `src\features\devices\components\device-utils.ts` | feature-surface | 16 | none |
| `src\features\devices\components\device-vibration-chart.tsx` | feature-surface | 37 | mojibake, fixed-height |
| `src\features\devices\components\error-box.tsx` | feature-surface | 17 | mojibake |
| `src\features\devices\components\export-modal.tsx` | feature-surface | 113 | mojibake, overlay, input, button |
| `src\features\devices\components\index.ts` | feature-surface | 21 | none |
| `src\features\devices\components\mobile-device-content.tsx` | feature-surface | 15 | none |
| `src\features\devices\components\mobile-device-header.tsx` | feature-surface | 13 | mojibake, button |
| `src\features\devices\components\mobile-tab-selector.tsx` | feature-surface | 10 | tabs, button |
| `src\features\devices\components\stat-card.tsx` | feature-surface | 12 | none |
| `src\features\devices\hooks\use-create-device.ts` | feature-support | 22 | mojibake |
| `src\features\devices\hooks\use-delete-device.ts` | feature-support | 22 | mojibake |
| `src\features\devices\hooks\use-device-detail.ts` | feature-support | 50 | none |
| `src\features\devices\hooks\use-device-error-codes.ts` | feature-support | 80 | none |
| `src\features\devices\hooks\use-device-realtime.ts` | feature-support | 19 | none |
| `src\features\devices\hooks\use-device-runtime-chart.ts` | feature-support | 45 | none |
| `src\features\devices\hooks\use-devices.ts` | feature-support | 62 | none |
| `src\features\devices\hooks\use-device-sessions.ts` | feature-support | 83 | none |
| `src\features\devices\hooks\use-device-vibration-chart.ts` | feature-support | 50 | none |
| `src\features\devices\hooks\use-send-command.ts` | feature-support | 23 | mojibake |
| `src\features\devices\hooks\use-update-device.ts` | feature-support | 23 | mojibake |
| `src\features\devices\hooks\use-update-device-settings.ts` | feature-support | 24 | mojibake |
| `src\features\devices\types\index.ts` | feature-support | 42 | none |
| `src\features\drivers\components\driver-columns.tsx` | feature-surface | 55 | mojibake, table, button |
| `src\features\drivers\components\driver-form.tsx` | feature-surface | 216 | mojibake, fixed-height, overlay, input, button |
| `src\features\drivers\types\index.ts` | feature-support | 31 | none |
| `src\features\fuel-analytics\components\fuel-analytics-page.tsx` | feature-surface | 39 | none |
| `src\features\fuel-analytics\components\fuel-by-vehicle-chart.tsx` | feature-surface | 63 | mojibake, fixed-height |
| `src\features\fuel-analytics\components\fuel-date-filter.tsx` | feature-surface | 68 | mojibake, fixed-width, input |
| `src\features\fuel-analytics\components\fuel-summary-cards.tsx` | feature-surface | 50 | mojibake |
| `src\features\fuel-analytics\components\fuel-trends-chart.tsx` | feature-surface | 84 | mojibake, fixed-height |
| `src\features\fuel-analytics\hooks\use-fuel-analytics.ts` | feature-support | 75 | none |
| `src\features\fuel-analytics\types\index.ts` | feature-support | 26 | none |
| `src\features\geofences\components\geofence-columns.tsx` | feature-surface | 54 | table, button |
| `src\features\geofences\components\geofence-form.tsx` | feature-surface | 105 | overlay, input, button |
| `src\features\geofences\components\geofence-map-editor.tsx` | feature-surface | 25 | fixed-height |
| `src\features\geofences\components\geofence-vehicle-binder.tsx` | feature-surface | 31 | none |
| `src\features\geofences\hooks\use-geofences.ts` | feature-support | 7 | none |
| `src\features\maintenance\components\maintenance-calendar.tsx` | feature-surface | 44 | mojibake |
| `src\features\maintenance\components\mileage-forecaster.tsx` | feature-surface | 28 | fixed-height |
| `src\features\map\components\device-cluster.tsx` | feature-surface | 24 | none |
| `src\features\map\components\device-filter.tsx` | feature-surface | 31 | mojibake, input |
| `src\features\map\components\device-filter-compact.tsx` | feature-surface | 46 | mojibake, button |
| `src\features\map\components\device-list-item.tsx` | feature-surface | 31 | mojibake, button |
| `src\features\map\components\device-list-panel.tsx` | feature-surface | 66 | mojibake, viewport, fixed-width, fixed-height |
| `src\features\map\components\device-marker.tsx` | feature-surface | 32 | mojibake |
| `src\features\map\components\device-search.tsx` | feature-surface | 22 | mojibake, input |
| `src\features\map\components\geofence-layer.tsx` | feature-surface | 23 | none |
| `src\features\map\components\index.ts` | feature-surface | 12 | none |
| `src\features\map\components\map-controls.tsx` | feature-surface | 115 | mojibake, button |
| `src\features\map\components\map-layer-switcher.tsx` | feature-surface | 30 | mojibake, button |
| `src\features\map\components\map-sidebar.tsx` | feature-surface | 80 | mojibake, fixed-height, tabs, input, button |
| `src\features\map\components\map-toolbar.tsx` | feature-surface | 19 | button |
| `src\features\map\components\map-view.tsx` | feature-surface | 36 | none |
| `src\features\map\components\marker-icon.ts` | feature-surface | 20 | none |
| `src\features\map\components\mobile-device-drawer.tsx` | feature-surface | 86 | mojibake, fixed-height, overlay, button |
| `src\features\map\components\selected-device-card.tsx` | feature-surface | 37 | mojibake |
| `src\features\map\components\tracking-map.tsx` | feature-surface | 90 | fixed-width |
| `src\features\map\components\vehicle-marker.tsx` | feature-surface | 39 | none |
| `src\features\map\constants\map-config.ts` | feature-support | 37 | mojibake |
| `src\features\map\hooks\use-device-positions.ts` | feature-support | 39 | none |
| `src\features\map\hooks\use-map-realtime.ts` | feature-support | 54 | none |
| `src\features\map\store\map-store.ts` | feature-support | 57 | none |
| `src\features\map\types\index.ts` | feature-support | 20 | none |
| `src\features\marketing\components\landing-architecture.tsx` | feature-surface | 72 | mojibake, fixed-width, button |
| `src\features\marketing\components\landing-feature-grid.tsx` | feature-surface | 44 | mojibake |
| `src\features\marketing\components\landing-header.tsx` | feature-surface | 53 | mojibake, fixed-width, button |
| `src\features\marketing\components\landing-hero.tsx` | feature-surface | 113 | mojibake, fixed-width, button |
| `src\features\marketing\components\landing-page.tsx` | feature-surface | 51 | mojibake, viewport |
| `src\features\marketing\components\landing-proof.tsx` | feature-surface | 80 | mojibake |
| `src\features\marketing\components\marketing-section-heading.tsx` | feature-surface | 31 | none |
| `src\features\marketing\data\landing-content.ts` | feature-support | 117 | mojibake |
| `src\features\notifications\components\notification-badge.tsx` | feature-surface | 25 | button |
| `src\features\notifications\components\notification-center.tsx` | feature-surface | 7 | none |
| `src\features\notifications\components\notification-dropdown.tsx` | feature-surface | 73 | fixed-width, fixed-height, overlay, button |
| `src\features\notifications\components\notification-filters.tsx` | feature-surface | 95 | mojibake, fixed-width, input |
| `src\features\notifications\components\notification-item.tsx` | feature-surface | 26 | mojibake, button |
| `src\features\notifications\components\notification-list.tsx` | feature-surface | 103 | mojibake, button |
| `src\features\notifications\components\notification-stats.tsx` | feature-surface | 23 | mojibake |
| `src\features\notifications\hooks\use-mark-all-read.ts` | feature-support | 19 | mojibake |
| `src\features\notifications\hooks\use-notifications.ts` | feature-support | 8 | none |
| `src\features\notifications\hooks\use-realtime-events.ts` | feature-support | 73 | mojibake |
| `src\features\notifications\hooks\use-unread-count.ts` | feature-support | 12 | none |
| `src\features\notifications\types\index.ts` | feature-support | 10 | none |
| `src\features\settings\components\notification-prefs.tsx` | feature-surface | 31 | none |
| `src\features\settings\components\password-form.tsx` | feature-surface | 47 | input, button |
| `src\features\settings\components\profile-form.tsx` | feature-surface | 29 | input, button |
| `src\features\settings\components\theme-selector.tsx` | feature-surface | 2 | none |
| `src\features\simulator\components\data-configurator.tsx` | feature-surface | 88 | input |
| `src\features\simulator\components\device-selector.tsx` | feature-surface | 69 | mojibake, fixed-height, input |
| `src\features\simulator\components\simulation-controls.tsx` | feature-surface | 103 | mojibake, input, button |
| `src\features\simulator\components\simulation-preview.tsx` | feature-surface | 48 | mojibake, fixed-height |
| `src\features\simulator\hooks\use-simulator.ts` | feature-support | 240 | mojibake |
| `src\features\statistics\components\device-uptime-chart.tsx` | feature-surface | 65 | mojibake, fixed-height |
| `src\features\statistics\components\fleet-utilization-chart.tsx` | feature-surface | 47 | mojibake, fixed-height |
| `src\features\statistics\components\statistics-overview.tsx` | feature-surface | 138 | mojibake, fixed-width, input, button |
| `src\features\statistics\hooks\use-statistics.ts` | feature-support | 94 | none |
| `src\features\system-admin\components\chart-views\line-chart-view.tsx` | feature-surface | 58 | fixed-height |
| `src\features\system-admin\components\chart-views\table-view.tsx` | feature-surface | 52 | mojibake, fixed-height, table |
| `src\features\system-admin\components\data-table\column-header.tsx` | feature-surface | 32 | table, button |
| `src\features\system-admin\components\data-table\data-table.tsx` | feature-surface | 121 | mojibake, table |
| `src\features\system-admin\components\data-table\pagination.tsx` | feature-surface | 36 | mojibake, table, button |
| `src\features\system-admin\components\data-table\toolbar.tsx` | feature-surface | 39 | mojibake, fixed-width, table, input, button |
| `src\features\system-admin\components\logs-filter.tsx` | feature-surface | 62 | mojibake, fixed-width, input |
| `src\features\system-admin\components\logs-viewer.tsx` | feature-surface | 73 | mojibake, fixed-width, table |
| `src\features\system-admin\components\metrics-explorer.tsx` | feature-surface | 97 | mojibake, fixed-width, fixed-height, table, input, button |
| `src\features\system-admin\components\query-builder.tsx` | feature-surface | 214 | mojibake, input, button |
| `src\features\system-admin\components\query-results-table.tsx` | feature-surface | 46 | mojibake, fixed-width, table |
| `src\features\system-admin\constants.ts` | support | 18 | mojibake |
| `src\features\system-admin\hooks\use-system-admin.ts` | feature-support | 210 | none |
| `src\features\system-admin\types.ts` | support | 45 | none |
| `src\features\system-status\components\health-card.tsx` | feature-surface | 19 | mojibake |
| `src\features\system-status\components\metric-card.tsx` | feature-surface | 26 | none |
| `src\features\system-status\components\status-badge.tsx` | feature-surface | 12 | mojibake |
| `src\features\system-status\components\status-progress.tsx` | feature-surface | 11 | none |
| `src\features\system-status\hooks\use-system-status.ts` | feature-support | 81 | none |
| `src\features\trips\components\trip-columns.tsx` | feature-surface | 55 | mojibake, table, button |
| `src\features\trips\components\trip-detail.tsx` | feature-surface | 50 | fixed-height |
| `src\features\trips\components\trip-form.tsx` | feature-surface | 85 | mojibake, overlay, input, button |
| `src\features\trips\components\trip-replay-controls.tsx` | feature-surface | 57 | input, button |
| `src\features\trips\hooks\use-trip-live-tracking.ts` | feature-support | 20 | none |
| `src\features\vehicles\components\vehicle-assign-device.tsx` | feature-surface | 60 | overlay, input, button |
| `src\features\vehicles\components\vehicle-columns.tsx` | feature-surface | 51 | mojibake, table, button |
| `src\features\vehicles\components\vehicle-detail-modal.tsx` | feature-surface | 45 | mojibake, tabs, overlay, button |
| `src\features\vehicles\components\vehicle-form.tsx` | feature-surface | 88 | mojibake, overlay, input, button |

## hooks

| File | Role | Lines | Flags |
| --- | --- | ---: | --- |
| `src\hooks\mutations\use-create-export.ts` | app-support | 28 | mojibake |
| `src\hooks\use-breadcrumbs.tsx` | app-support | 91 | none |
| `src\hooks\use-device-status-realtime.ts` | app-support | 92 | none |
| `src\hooks\use-media-query.ts` | app-support | 14 | none |
| `src\hooks\use-mobile.ts` | app-support | 15 | none |
| `src\hooks\use-nav.ts` | app-support | 48 | none |
| `src\hooks\use-realtime-subscription.ts` | app-support | 29 | none |
| `src\hooks\use-role-access.ts` | app-support | 31 | none |

## lib

| File | Role | Lines | Flags |
| --- | --- | ---: | --- |
| `src\lib\api\alerts.ts` | api-support | 14 | none |
| `src\lib\api\auth.ts` | api-support | 34 | none |
| `src\lib\api\client.ts` | api-support | 69 | none |
| `src\lib\api\customers.ts` | api-support | 11 | none |
| `src\lib\api\dashboard.ts` | api-support | 15 | none |
| `src\lib\api\device-detail.ts` | api-support | 80 | none |
| `src\lib\api\devices.ts` | api-support | 31 | none |
| `src\lib\api\drivers.ts` | api-support | 13 | none |
| `src\lib\api\export.ts` | api-support | 59 | none |
| `src\lib\api\exports.ts` | api-support | 1 | none |
| `src\lib\api\firmware.ts` | api-support | 15 | none |
| `src\lib\api\geofences.ts` | api-support | 13 | none |
| `src\lib\api\maintenance.ts` | api-support | 11 | none |
| `src\lib\api\map.ts` | api-support | 4 | none |
| `src\lib\api\notifications.ts` | api-support | 10 | none |
| `src\lib\api\simulator.ts` | api-support | 22 | none |
| `src\lib\api\statistics.ts` | api-support | 11 | none |
| `src\lib\api\system-admin.ts` | api-support | 18 | none |
| `src\lib\api\system-status.ts` | api-support | 5 | none |
| `src\lib\api\trips.ts` | api-support | 15 | none |
| `src\lib\api\users.ts` | api-support | 30 | none |
| `src\lib\api\vehicles.ts` | api-support | 13 | none |
| `src\lib\api\violations.ts` | api-support | 11 | none |
| `src\lib\notification.ts` | lib-support | 14 | none |
| `src\lib\store\map-store.ts` | lib-support | 1 | none |
| `src\lib\stores\auth-store.ts` | lib-support | 28 | none |
| `src\lib\stores\map-store.ts` | lib-support | 1 | none |
| `src\lib\utils.ts` | lib-support | 5 | none |
| `src\lib\utils\browser-notification.ts` | lib-support | 55 | mojibake |
| `src\lib\utils\date\format.ts` | lib-support | 57 | none |
| `src\lib\utils\logger.ts` | lib-support | 14 | none |
| `src\lib\utils\query-invalidation.ts` | lib-support | 65 | none |
| `src\lib\validations\alert.schema.ts` | validation-support | 12 | none |
| `src\lib\validations\auth.schema.ts` | validation-support | 7 | none |
| `src\lib\validations\customer.schema.ts` | validation-support | 11 | none |
| `src\lib\validations\device.schema.ts` | validation-support | 15 | none |
| `src\lib\validations\export.schema.ts` | validation-support | 12 | none |
| `src\lib\validations\firmware.schema.ts` | validation-support | 12 | none |
| `src\lib\validations\geofence.schema.ts` | validation-support | 9 | none |
| `src\lib\validations\maintenance.schema.ts` | validation-support | 10 | none |
| `src\lib\validations\settings.schema.ts` | validation-support | 20 | none |
| `src\lib\validations\trip.schema.ts` | validation-support | 10 | none |
| `src\lib\validations\user.schema.ts` | validation-support | 9 | none |
| `src\lib\validations\vehicle.schema.ts` | validation-support | 18 | none |

## types

| File | Role | Lines | Flags |
| --- | --- | ---: | --- |
| `src\types\index.ts` | type-support | 25 | none |

## Unresolved questions
- Which supporting logic files map to hidden UX regressions due to API shape or missing pagination contracts?
- Which routes are used most on mobile in production, to prioritize audit remediation?
