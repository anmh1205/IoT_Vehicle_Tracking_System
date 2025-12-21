namespace Device {
    // Request types
    export interface CreateDeviceRequest {
        device_id: string;
        device_name: string;
        vibration_threshold?: number;
    }

    export interface UpdateDeviceRequest {
        device_id?: string;
        device_name?: string;
        vibration_threshold?: number;
    }

    export interface DeviceFilter {
        status?: string;
        search?: string;
        quarterStartDate?: string; // ISO date string for quarter start
        quarterEndDate?: string; // ISO date string for quarter end
    }

    // Response types
    export interface DeviceDto {
        device_id: string;
        device_name: string;
        current_status: 'running' | 'disconnected' | 'stopped' | null;
        last_seen_at: string | null;
        total_runtime_seconds: number | null;
        quarter_runtime_seconds: number | null;
        request_interval?: number | null; // Optional for backward compatibility
    }

    export interface DeviceListResponseDto {
        devices: DeviceDto[];
    }

    export interface DeviceDetailDto extends DeviceDto {
        technical: {
            imei: string | null;
            battery_top: number | null;
            battery_bot: number | null;
            firmware_version: string | null;
            vibration_threshold: number | null;
        };
    }

    export interface DeviceDetail {
        device_id: string;
        device_name: string;
        current_status: 'running' | 'disconnected' | 'stopped' | null;
        last_seen_at: string | null;
        total_runtime_seconds: number | null;
        quarter_runtime_seconds: number | null;
        vibration_threshold: number | null;
        request_interval: number | null;
        technical: {
            imei: string | null;
            battery_top: number | null;
            battery_bot: number | null;
            firmware_version: string | null;
            signal_strength: number | null;
            temperature: number | null;
            last_maintenance: string | null;
        };
    }

    export interface Session {
        id: string;
        device_id: string;
        session_start: string;
        session_end: string | null;
        total_runtime_seconds: number;
        status: 'completed' | 'running' | 'interrupted';
        vibration_peaks: number;
        avg_vibration: number;
        max_vibration?: number | null;
        data_points_count?: number | null;
        avg_battery_top?: number | null;
        avg_battery_bot?: number | null;
    }

    export interface SessionDto {
        id: number;
        status: string;
        session_start: string;
        session_end: string | null;
        uptime: number;
        avg_vibration?: number;
        min_vibration?: number;
        max_vibration?: number;
        avg_battery_top?: number;
        min_battery_top?: number;
        max_battery_top?: number;
        avg_battery_bot?: number;
        min_battery_bot?: number;
        max_battery_bot?: number;
        data_points_count?: number;
    }

    export interface SessionsResponse {
        sessions: Session[];
        total: number;
        page: number;
        totalPages: number;
    }

    export interface RuntimeStats {
        today: number;
        week: number;
        month: number;
        quarter: number;
        year: number;
        total: number;
        efficiency: number;
        avg_session_duration: number;
        latest_session?: {
            id: number;
            avg_battery_top: number | null;
            avg_battery_bot: number | null;
            avg_vibration: number | null;
        } | null;
    }

    export interface TechnicalInfo {
        imei: string | null;
        battery_top: number | null;
        battery_bot: number | null;
        firmware_version: string | null;
        signal_strength: number | null;
        temperature: number | null;
        last_maintenance: string | null;
        next_maintenance: string | null;
        maintenance_history: Array<{
            date: string;
            type: string;
            description: string;
            technician: string;
        }>;
    }

    export interface DeviceSettings {
        vibration_threshold: number | null;
        request_interval: number | null;
        alert_settings: {
            email_alerts: boolean;
            sms_alerts: boolean;
            vibration_threshold: number;
            battery_low_threshold: number;
            temperature_high_threshold: number;
        };
        maintenance_schedule: {
            interval_days: number;
            last_maintenance: string | null;
            next_maintenance: string | null;
        };
    }

    export interface ErrorCode {
        id: string;
        error_code: string;
        error_type: string;
        message: string;
        status: 'active' | 'resolved' | 'ignored';
        created_at: string;
        resolved_at: string | null;
    }

    export interface ErrorCodesResponse {
        errorCodes: ErrorCode[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }

    export interface RealtimeData {
        current_status: 'running' | 'disconnected' | 'stopped' | null;
        vibration_level: number | null;
        battery_top: number | null;
        battery_bot: number | null;
        temperature: number | null;
        signal_strength: number | null;
        last_heartbeat: string | null;
        uptime_seconds?: number;
    }

    export interface DeviceIssue {
        id: string;
        type: 'connection' | 'battery' | 'vibration' | 'firmware' | 'sensor';
        severity: 'critical' | 'warning' | 'info';
        status: 'active' | 'resolved';
        title: string;
        firstOccurred: string;
        lastOccurred: string;
        occurrenceCount: number;
    }

    export interface DeviceIssuesResponse {
        issues: DeviceIssue[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalItems: number;
            itemsPerPage: number;
        };
        summary: {
            total: number;
            active: number;
            resolved: number;
            critical: number;
            warning: number;
            info: number;
        };
    }

    export interface VibrationReference {
        deviceId: string;
        period: string;
        statistics: {
            average: number;
            min: number;
            max: number;
            median: number;
            percentile95: number;
            percentile99: number;
        };
        recommendations: {
            normal: { min: number; max: number; description: string };
            warning: { min: number; max: number; description: string };
            critical: { min: number; max: number; description: string };
        };
        historicalData: Array<{
            date: string;
            avg: number;
            max: number;
        }>;
        suggestedThreshold: number;
    }
}

