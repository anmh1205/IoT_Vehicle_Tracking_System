namespace Dashboard {
    export interface RuntimeHistoryDto {
        days: number;
        series: Array<{
            id: string;
            label: string;
            points: Array<{ x: string; y: number }>;
        }>;
    }

    export interface DashboardStatsDto {
        total_devices?: number;
        devices_running?: number;
        devices_disconnected?: number;
        devices_stopped?: number;
        runtime_today_seconds?: number;
        runtime_quarter_seconds?: number;
        sessions_today?: number;
        sessions_quarter?: number;
        runtime_history?: RuntimeHistoryDto;
        runtime_history_week?: RuntimeHistoryDto;
        runtime_history_month?: RuntimeHistoryDto;
        runtime_history_90?: RuntimeHistoryDto;
    }

    export interface ActivityItemDto {
        id: string;
        message: string;
        created_at: string;
        device_name: string;
        device_id: string;
    }

    export interface AlertItemDto {
        id: string;
        code: string;
        level: string;
        created_at: string;
    }

    export interface RuntimeSeriesDto {
        labels: string[];
        series: number[];
    }
}

