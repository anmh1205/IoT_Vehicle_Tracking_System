import { http } from './http';
import { API } from './endpoints';

export const dashboardServices = {
    getStats: (runtimeDays?: number) =>
        http
            .get<Dashboard.DashboardStatsDto>(
                runtimeDays ? `${API.DASHBOARD.STATS}?runtime_days=${runtimeDays}` : API.DASHBOARD.STATS
            )
            .then(r => r),
    getActivity: () =>
        http
            .get<{ activities: Dashboard.ActivityItemDto[] }>(API.DASHBOARD.ACTIVITY)
            .then(r => r.activities),
    getAlerts: () =>
        http
            .get<{ alerts: Dashboard.AlertItemDto[] }>(API.DASHBOARD.ALERTS)
            .then(r => r.alerts),
};
