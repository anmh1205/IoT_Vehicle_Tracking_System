export interface DashboardStatsDeltaEvent {
    updated_at: string;
}

export interface DashboardActivityEventPayload {
    id: number;
    device_id: string;
    device_name: string;
    action: string;
    message: string;
    timestamp: string;
    created_at: string;
}

export interface DashboardAlertEventPayload {
    id: number;
    device_id: string;
    device_name: string;
    error_code: string;
    message: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical' | string;
}

export interface DeviceRuntimeStatsEventPayload {
    today?: number;
    week?: number;
    month?: number;
    quarter?: number;
    year?: number;
    total?: number;
}

export interface DeviceRealtimeMetricsEventPayload {
    vibration_value?: number | null;
    battery_top?: number | null;
    battery_bot?: number | null;
    ac_power?: boolean | null;
    error_code?: number | null;
    timestamp?: string | null;
    uptime_seconds?: number | null;
}

export interface DeviceStatusEventPayload {
    device_id: string;
    device_name: string;
    status: 'running' | 'stopped' | 'disconnected' | null;
    last_seen_at: string | null;
    total_runtime_seconds: number;
    quarter_runtime_seconds?: number;
    runtime_stats?: DeviceRuntimeStatsEventPayload;
    realtime_metrics?: DeviceRealtimeMetricsEventPayload;
    updated_at: string;
}

export interface DeviceListChangeEventPayload {
    action: 'created' | 'updated' | 'deleted';
    device_id: string;
    device_name: string;
    status?: 'running' | 'stopped' | 'disconnected' | null;
    last_seen_at?: string | null;
    total_runtime_seconds?: number;
    updated_at: string;
}

export interface DeviceSessionDeltaEventPayload {
    session_id: number;
    device_id: string;
    status: string;
    session_start: string;
    session_end: string | null;
    uptime_seconds: number | null;
    data_points_count: number | null;
    avg_vibration?: number | null;
    min_vibration?: number | null;
    max_vibration?: number | null;
    avg_battery_top?: number | null;
    min_battery_top?: number | null;
    max_battery_top?: number | null;
    avg_battery_bot?: number | null;
    min_battery_bot?: number | null;
    max_battery_bot?: number | null;
    updated_at: string;
}

export interface FirmwareAssignmentEventPayload {
    assignment: Firmware.FirmwareAssignmentDto;
    emitted_at: string;
}

export interface ExportJobEventPayload {
    job_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number | null;
    download_token?: string | null;
    error_message?: string | null;
    page?: string | null;
    tab?: string | null;
    device_id?: string | null;
    updated_at: string;
}


