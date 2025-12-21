"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { getRealtimeSocket, disconnectRealtimeSocket, type NamespaceKey } from "@/lib/realtime/client";
import type {
    DashboardActivityEventPayload,
    DashboardAlertEventPayload,
    DeviceListChangeEventPayload,
    DeviceStatusEventPayload,
    ExportJobEventPayload,
    FirmwareAssignmentEventPayload,
} from "@/lib/realtime/events";
import { useAuthStore } from "@/lib/store/authStore";

type ConnectionStatus = "connected" | "connecting" | "disconnected";

interface IRealtimeContext {
    getSocket: (namespace: NamespaceKey) => Socket;
    status: Partial<Record<NamespaceKey, ConnectionStatus>>;
    joinDeviceRoom: (deviceId: string) => void;
    leaveDeviceRoom: (deviceId: string) => void;
}

const RealtimeContext = createContext<IRealtimeContext | null>(null);

const DASHBOARD_STATS_KEY = ["dashboard", "stats"];
const DASHBOARD_RUNTIME_KEY = ["dashboard", "runtime-history"];
const DASHBOARD_ACTIVITY_KEY = ["dashboard", "activity"];
const DASHBOARD_ALERTS_KEY = ["dashboard", "alerts"];
const DEVICE_LIST_KEY = ["devices", "list"];

const toActivityItem = (payload: DashboardActivityEventPayload): Dashboard.ActivityItemDto => ({
    id: String(payload.id),
    message: payload.message || payload.action,
    created_at: payload.created_at || payload.timestamp,
    device_name: payload.device_name,
    device_id: payload.device_id,
});

const toAlertItem = (payload: DashboardAlertEventPayload): Dashboard.AlertItemDto => ({
    id: String(payload.id),
    code: payload.message || payload.error_code,
    level: payload.severity || "info",
    created_at: payload.timestamp,
});

const toDeviceListItem = (payload: DeviceStatusEventPayload | DeviceListChangeEventPayload): Device.DeviceDto => ({
    device_id: payload.device_id,
    device_name: payload.device_name,
    current_status: (payload as DeviceStatusEventPayload).status ?? (payload as DeviceListChangeEventPayload).status ?? "stopped",
    last_seen_at: (payload as DeviceStatusEventPayload).last_seen_at ?? (payload as DeviceListChangeEventPayload).last_seen_at ?? null,
    total_runtime_seconds:
        (payload as DeviceStatusEventPayload).total_runtime_seconds ??
        (payload as DeviceListChangeEventPayload).total_runtime_seconds ??
        0,
    quarter_runtime_seconds:
        (payload as DeviceStatusEventPayload).quarter_runtime_seconds ??
        (payload as DeviceListChangeEventPayload).total_runtime_seconds ??
        0,
});

export default function RealtimeProvider({ children }: { children: ReactNode }) {
    const token = useAuthStore((state) => state.token);
    const queryClient = useQueryClient();
    const namespaces = useMemo<NamespaceKey[]>(() => ["dashboard", "devices", "firmware", "exports", "notifications"], []);
    const [status, setStatus] = useState<Partial<Record<NamespaceKey, ConnectionStatus>>>({});
    const tokenRef = useRef<string | null | undefined>(token);
    const fallbackTimers = useRef<Partial<Record<NamespaceKey, ReturnType<typeof setInterval>>>>({});

    useEffect(() => {
        tokenRef.current = token;
    }, [token]);

    useEffect(
        () => () => {
            disconnectRealtimeSocket();
        },
        [],
    );

    useEffect(() => {
        const subscriptions = namespaces.map((namespace) => {
            const socket = getRealtimeSocket(namespace, token ?? null);
            const handleConnect = () => {
                setStatus((prev) => ({ ...prev, [namespace]: "connected" }));
            };
            const handleDisconnect = (reason: string) => {
                setStatus((prev) => ({ ...prev, [namespace]: "disconnected" }));
            };
            const handleError = (error: Error) => {
                setStatus((prev) => ({ ...prev, [namespace]: "disconnected" }));
            };

            socket.on("connect", handleConnect);
            socket.on("disconnect", handleDisconnect);
            socket.on("connect_error", handleError);

            if (!socket.connected) {
                setStatus((prev) => ({ ...prev, [namespace]: "connecting" }));
                socket.connect();
            }

            return { socket, handleConnect, handleDisconnect, handleError };
        });

        return () => {
            subscriptions.forEach(({ socket, handleConnect, handleDisconnect, handleError }) => {
                socket.off("connect", handleConnect);
                socket.off("disconnect", handleDisconnect);
                socket.off("connect_error", handleError);
            });
        };
    }, [namespaces, token]);

    useEffect(() => {
        namespaces.forEach((namespace) => {
            const currentStatus = status[namespace];
            const activeTimer = fallbackTimers.current[namespace];

            if (currentStatus === 'connected' || currentStatus === 'connecting' || currentStatus === undefined) {
                if (activeTimer) {
                    clearInterval(activeTimer);
                    delete fallbackTimers.current[namespace];
                }
                return;
            }

            if (currentStatus === 'disconnected' && !activeTimer) {
                if (namespace === 'dashboard') {
                    fallbackTimers.current[namespace] = setInterval(() => {
                        void queryClient.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY });
                        void queryClient.invalidateQueries({ queryKey: DASHBOARD_ACTIVITY_KEY });
                        void queryClient.invalidateQueries({ queryKey: DASHBOARD_ALERTS_KEY });
                        void queryClient.invalidateQueries({ queryKey: DASHBOARD_RUNTIME_KEY, exact: false });
                    }, 20000);
                }

                if (namespace === 'devices') {
                    fallbackTimers.current[namespace] = setInterval(() => {
                        void queryClient.invalidateQueries({ queryKey: DEVICE_LIST_KEY });
                    }, 20000);
                }
            }
        });

        return () => {
            Object.values(fallbackTimers.current).forEach((timer) => {
                if (timer) {
                    clearInterval(timer);
                }
            });
            fallbackTimers.current = {};
        };
    }, [namespaces, queryClient, status]);

    const appendActivityItem = useCallback(
        (payload: DashboardActivityEventPayload) => {
            queryClient.setQueryData<Dashboard.ActivityItemDto[] | undefined>(DASHBOARD_ACTIVITY_KEY, (current) => {
                const mapped = toActivityItem(payload);
                if (!current) {
                    return [mapped];
                }
                const deduped = current.filter((item) => item.id !== mapped.id);
                return [mapped, ...deduped].slice(0, 50);
            });
        },
        [queryClient],
    );

    const appendAlertItem = useCallback(
        (payload: DashboardAlertEventPayload) => {
            queryClient.setQueryData<Dashboard.AlertItemDto[] | undefined>(DASHBOARD_ALERTS_KEY, (current) => {
                const mapped = toAlertItem(payload);
                if (!current) {
                    return [mapped];
                }
                const deduped = current.filter((item) => item.id !== mapped.id);
                return [mapped, ...deduped].slice(0, 50);
            });
        },
        [queryClient],
    );

    const updateDashboardStatsFromDeviceList = useCallback(() => {
        const deviceList = queryClient.getQueryData<Device.DeviceDto[] | undefined>(DEVICE_LIST_KEY);
        if (!deviceList || deviceList.length === 0) {
            return;
        }

        // Calculate device counts from device list
        const totalDevices = deviceList.length;
        const devicesRunning = deviceList.filter((d) => d.current_status === 'running').length;
        const devicesStopped = deviceList.filter((d) => d.current_status === 'stopped').length;
        const devicesDisconnected = deviceList.filter((d) => d.current_status === 'disconnected').length;

        // Update dashboard stats cache with device counts
        queryClient.setQueryData<Dashboard.DashboardStatsDto | undefined>(DASHBOARD_STATS_KEY, (current) => {
            if (!current) {
                return {
                    total_devices: totalDevices,
                    devices_running: devicesRunning,
                    devices_stopped: devicesStopped,
                    devices_disconnected: devicesDisconnected,
                };
            }

            return {
                ...current,
                total_devices: totalDevices,
                devices_running: devicesRunning,
                devices_stopped: devicesStopped,
                devices_disconnected: devicesDisconnected,
            };
        });
    }, [queryClient]);

    const applyDeviceStatus = useCallback(
        (payload: DeviceStatusEventPayload) => {
            queryClient.setQueryData<Device.DeviceDto[] | undefined>(DEVICE_LIST_KEY, (current) => {
                if (!current) {
                    return current;
                }
                const mapped = toDeviceListItem(payload);
                const exists = current.some((device) => device.device_id === mapped.device_id);
                if (!exists) {
                    return [mapped, ...current];
                }
                const updated = current.map((device) =>
                    device.device_id === mapped.device_id
                        ? {
                            ...device,
                            current_status: mapped.current_status,
                            last_seen_at: mapped.last_seen_at,
                            total_runtime_seconds: mapped.total_runtime_seconds,
                            quarter_runtime_seconds: mapped.quarter_runtime_seconds,
                            device_name: mapped.device_name,
                        }
                        : device,
                );
                return updated;
            });

            // Update dashboard stats from updated device list
            updateDashboardStatsFromDeviceList();
        },
        [queryClient, updateDashboardStatsFromDeviceList],
    );

    const applyDeviceListChange = useCallback(
        (payload: DeviceListChangeEventPayload) => {
            queryClient.setQueryData<Device.DeviceDto[] | undefined>(DEVICE_LIST_KEY, (current) => {
                if (!current) {
                    if (payload.action === "created") {
                        return [toDeviceListItem(payload)];
                    }
                    return current;
                }

                if (payload.action === "created") {
                    const exists = current.some((device) => device.device_id === payload.device_id);
                    if (exists) {
                        return current;
                    }
                    return [toDeviceListItem(payload), ...current];
                }

                if (payload.action === "deleted") {
                    return current.filter((device) => device.device_id !== payload.device_id);
                }

                return current.map((device) =>
                    device.device_id === payload.device_id
                        ? {
                            ...device,
                            device_name: payload.device_name,
                            current_status: payload.status ?? device.current_status,
                            last_seen_at: payload.last_seen_at ?? device.last_seen_at,
                            total_runtime_seconds: payload.total_runtime_seconds ?? device.total_runtime_seconds,
                        }
                        : device,
                );
            });

            // Update dashboard stats from updated device list
            updateDashboardStatsFromDeviceList();
        },
        [queryClient, updateDashboardStatsFromDeviceList],
    );

    useEffect(() => {
        const socket = getRealtimeSocket("dashboard", token ?? null);

        const handleStats = () => {
            // Runtime history needs recalculation from database, so invalidate
            void queryClient.invalidateQueries({ queryKey: DASHBOARD_RUNTIME_KEY, exact: false });
            // Device counts are updated from device list, so no need to invalidate
            // But runtime stats (today, week, month, quarter) need recalculation
            // So we still invalidate to get fresh runtime stats
            void queryClient.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY });
        };

        const handleActivity = (payload: DashboardActivityEventPayload) => {
            appendActivityItem(payload);
        };

        const handleAlert = (payload: DashboardAlertEventPayload) => {
            appendAlertItem(payload);
        };

        socket.on("dashboard.stats.updated", handleStats);
        socket.on("dashboard.activity.created", handleActivity);
        socket.on("dashboard.alert.created", handleAlert);

        if (!socket.connected) {
            socket.connect();
        }

        return () => {
            socket.off("dashboard.stats.updated", handleStats);
            socket.off("dashboard.activity.created", handleActivity);
            socket.off("dashboard.alert.created", handleAlert);
        };
    }, [appendActivityItem, appendAlertItem, queryClient, token]);

    useEffect(() => {
        const socket = getRealtimeSocket("devices", token ?? null);

        const handleStatusChange = (payload: DeviceStatusEventPayload) => {
            applyDeviceStatus(payload);
        };

        const handleListChange = (payload: DeviceListChangeEventPayload) => {
            applyDeviceListChange(payload);
        };

        socket.on("device.status.changed", handleStatusChange);
        socket.on("device.list.changed", handleListChange);

        if (!socket.connected) {
            socket.connect();
        }

        return () => {
            socket.off("device.status.changed", handleStatusChange);
            socket.off("device.list.changed", handleListChange);
        };
    }, [applyDeviceListChange, applyDeviceStatus, token]);

    useEffect(() => {
        const socket = getRealtimeSocket("firmware", token ?? null);

        const handleAssignment = (_payload: FirmwareAssignmentEventPayload) => {
            void queryClient.invalidateQueries({ queryKey: ["firmware", "assignments"], exact: false });
            void queryClient.invalidateQueries({ queryKey: ["firmware", "logs"], exact: false });
        };

        socket.on("firmware.assignment.updated", handleAssignment);

        if (!socket.connected) {
            socket.connect();
        }

        return () => {
            socket.off("firmware.assignment.updated", handleAssignment);
        };
    }, [queryClient, token]);

    useEffect(() => {
        const socket = getRealtimeSocket("exports", token ?? null);

        const handleExport = (payload: ExportJobEventPayload) => {
            queryClient.setQueryData<Export.ExportJobStatus | undefined>(["exportStatus", payload.job_id], (current) => ({
                status: payload.status,
                progress: payload.progress ?? current?.progress ?? 0,
                downloadToken: payload.download_token ?? current?.downloadToken,
                error: payload.error_message ?? undefined,
            }));
        };

        socket.on("export.job.updated", handleExport);

        if (!socket.connected) {
            socket.connect();
        }

        return () => {
            socket.off("export.job.updated", handleExport);
        };
    }, [queryClient, token]);

    const getSocket = useCallback(
        (namespace: NamespaceKey) => getRealtimeSocket(namespace, tokenRef.current ?? null),
        [],
    );

    const joinDeviceRoom = useCallback(
        (deviceId: string) => {
            if (!deviceId) {
                return;
            }
            const socket = getSocket("devices");
            socket.emit("device:join", { deviceId });
        },
        [getSocket],
    );

    const leaveDeviceRoom = useCallback(
        (deviceId: string) => {
            if (!deviceId) {
                return;
            }
            const socket = getSocket("devices");
            socket.emit("device:leave", { deviceId });
        },
        [getSocket],
    );

    const value = useMemo<IRealtimeContext>(
        () => ({
            getSocket,
            status,
            joinDeviceRoom,
            leaveDeviceRoom,
        }),
        [getSocket, joinDeviceRoom, leaveDeviceRoom, status],
    );

    return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export const useRealtimeContext = (): IRealtimeContext => {
    const context = useContext(RealtimeContext);
    if (!context) {
        throw new Error("useRealtimeContext must be used within RealtimeProvider");
    }
    return context;
};


