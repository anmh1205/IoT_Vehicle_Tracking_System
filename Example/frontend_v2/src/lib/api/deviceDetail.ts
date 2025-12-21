import { http } from './http';
import { notificationUtils } from '../notification';
import { resolveDeviceStatus } from '@/lib/utils/device-status';

export const deviceDetailServices = {
    getDeviceDetail: async (deviceId: string): Promise<Device.DeviceDetail> => {
        try {
            const detail = await http.get<Device.DeviceDetail>(`/device/${deviceId}/detail`);
            return {
                ...detail,
                current_status: resolveDeviceStatus(detail?.current_status ?? null, detail?.last_seen_at)
            };
        } catch (error) {
            console.error('Error getting device detail:', error);
            throw error;
        }
    },

    getDeviceSessions: async (
        deviceId: string,
        options: {
            page?: number;
            limit?: number;
            startDate?: string;
            endDate?: string;
        } = {}
    ): Promise<Device.SessionsResponse> => {
        try {
            const params = new URLSearchParams();
            if (options.page) params.append('page', options.page.toString());
            if (options.limit) params.append('limit', options.limit.toString());
            if (options.startDate) params.append('startDate', options.startDate);
            if (options.endDate) params.append('endDate', options.endDate);

            const response = await http.get<Device.SessionsResponse>(`/device/${deviceId}/sessions?${params}`);
            return response;
        } catch (error) {
            console.error('Error getting device sessions:', error);
            throw error;
        }
    },

    getRuntimeStats: async (deviceId: string, period: string = 'all'): Promise<Device.RuntimeStats> => {
        try {
            const response = await http.get<Device.RuntimeStats>(
                `/device/${deviceId}/runtime-stats?period=${period}`
            );
            return response;
        } catch (error) {
            console.error('Error getting runtime stats:', error);
            throw error;
        }
    },

    getTechnicalInfo: async (deviceId: string): Promise<Device.TechnicalInfo> => {
        try {
            const response = await http.get<Device.TechnicalInfo>(`/device/${deviceId}/technical`);
            return response;
        } catch (error) {
            console.error('Error getting technical info:', error);
            throw error;
        }
    },

    updateDeviceSettings: async (deviceId: string, settings: Partial<Device.DeviceSettings>): Promise<Device.DeviceSettings> => {
        try {
            // Backend now returns 200 OK with updated settings
            const response = await http.put<{ vibration_threshold: number | null; request_interval: number | null }>(`/device/${deviceId}/settings`, settings);
            
            // Merge backend response with default values for full DeviceSettings structure
            return {
                vibration_threshold: response?.vibration_threshold ?? null,
                request_interval: response?.request_interval ?? null,
                alert_settings: {
                    email_alerts: false,
                    sms_alerts: false,
                    vibration_threshold: response?.vibration_threshold ?? 0,
                    battery_low_threshold: 0,
                    temperature_high_threshold: 0
                },
                maintenance_schedule: {
                    interval_days: 0,
                    last_maintenance: null,
                    next_maintenance: null
                }
            };
        } catch (error) {
            console.error('Error updating device settings:', error);
            // Notification will be handled by http.ts
            throw error;
        }
    },

    exportSessions: async (
        deviceId: string,
        format: 'csv' | 'json' = 'csv',
        period?: string,
        startDate?: string,
        endDate?: string
    ): Promise<void> => {
        try {
            const params = new URLSearchParams();
            params.append('format', format);
            if (period) params.append('period', period);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            // Create download link
            const response = await http.getText(`/device/${deviceId}/export/sessions?${params}`);
            const blob = new Blob([response], {
                type: format === 'csv' ? 'text/csv' : 'application/json'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `device_${deviceId}_sessions.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            notificationUtils.success('Xuất dữ liệu thành công');
        } catch (error) {
            console.error('Error exporting sessions:', error);
            notificationUtils.error('Xuất dữ liệu thất bại');
            throw error;
        }
    },

    getRealtimeData: async (deviceId: string): Promise<Device.RealtimeData> => {
        try {
            const response = await http.get<Device.RealtimeData>(`/device/${deviceId}/realtime`);
            return response;
        } catch (error) {
            console.error('Error getting realtime data:', error);
            throw error;
        }
    },

    getDeviceIssues: async (
        deviceId: string,
        options: {
            page?: number;
            limit?: number;
            status?: 'active' | 'resolved';
            type?: 'connection' | 'battery' | 'vibration' | 'firmware' | 'sensor';
        } = {}
    ): Promise<Device.DeviceIssuesResponse> => {
        try {
            const params = new URLSearchParams();
            if (options.page) params.append('page', options.page.toString());
            if (options.limit) params.append('limit', options.limit.toString());
            if (options.status) params.append('status', options.status);
            if (options.type) params.append('type', options.type);

            const response = await http.get<Device.DeviceIssuesResponse>(
                `/device/${deviceId}/issues?${params}`
            );
            return response;
        } catch (error) {
            console.error('Error getting device issues:', error);
            throw error;
        }
    },

    exportDeviceIssues: async (
        deviceId: string,
        format: 'csv' | 'json' = 'csv'
    ): Promise<void> => {
        try {
            const params = new URLSearchParams();
            params.append('format', format);

            const data = await http.getText(`/device/${deviceId}/export/issues?${params}`);

            // Create download link
            const blob = new Blob([data], {
                type: format === 'csv' ? 'text/csv' : 'application/json'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `device_${deviceId}_issues_${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            notificationUtils.success('Xuất sự cố thiết bị thành công');
        } catch (error) {
            console.error('Error exporting device issues:', error);
            notificationUtils.error('Xuất sự cố thiết bị thất bại');
            throw error;
        }
    },

    getVibrationReference: async (deviceId: string, period: string = '7d'): Promise<Device.VibrationReference> => {
        try {
            const response = await http.get<Device.VibrationReference>(
                `/device/${deviceId}/vibration-reference?period=${period}`
            );
            return response;
        } catch (error) {
            console.error('Error getting vibration reference:', error);
            throw error;
        }
    },

    // New optimized APIs for each tab
    getOverviewData: async (deviceId: string): Promise<{
        device: Device.DeviceDetail;
        runtimeStats: Device.RuntimeStats;
        realtimeData: Device.RealtimeData;
    }> => {
        try {
            const data = await http.get<any>(`/device/${deviceId}/overview`);
            const lastSeen = data?.realtimeData?.last_heartbeat ?? data?.device?.last_seen_at ?? null;
            const resolvedStatus = resolveDeviceStatus(
                data?.realtimeData?.current_status ?? data?.device?.current_status ?? null,
                lastSeen
            );

            if (data?.realtimeData) {
                data.realtimeData.current_status = resolvedStatus;
            }
            if (data?.device) {
                data.device.current_status = resolvedStatus;
            }

            return data;
        } catch (error) {
            console.error('Error getting overview data:', error);
            throw error;
        }
    },

    getSessionsTabData: async (deviceId: string, page: number = 1, limit: number = 20): Promise<{
        sessions: Device.Session[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }> => {
        try {
            const response = await http.get<{
                sessions: Device.Session[];
                pagination: {
                    page: number;
                    limit: number;
                    total: number;
                    totalPages: number;
                };
            }>(`/device/${deviceId}/sessions-tab?page=${page}&limit=${limit}`);
            return response;
        } catch (error) {
            console.error('Error getting sessions tab data:', error);
            throw error;
        }
    },

    getErrorCodes: async (
        deviceId: string,
        page: number = 1,
        limit: number = 10,
        status: string = 'all',
        type: string = 'all'
    ): Promise<Device.ErrorCodesResponse> => {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                status,
                type
            });

            const response = await http.get<Device.ErrorCodesResponse>(
                `/device/${deviceId}/issues?${params}`
            );
            return response;
        } catch (error) {
            console.error('Error fetching error codes:', error);
            notificationUtils.error('Không thể tải danh sách lỗi');
            throw error;
        }
    },

    getSettingsTabData: async (deviceId: string, startDate?: string, endDate?: string): Promise<{
        device: {
            device_id: string;
            device_name: string;
            vibration_threshold: number | null;
            request_interval: number | null;
            imei: string | null;
            firmware_version: string | null;
        };
        vibrationReference: {
            average_vibration: number | null;
            min_vibration: number | null;
            max_vibration: number | null;
        };
    }> => {
        try {
            let url = `/device/${deviceId}/settings-tab`;
            if (startDate && endDate) {
                url += `?startDate=${startDate}&endDate=${endDate}`;
            }
            const response = await http.get<{
                device: {
                    device_id: string;
                    device_name: string;
                    vibration_threshold: number | null;
                    request_interval: number | null;
                    imei: string | null;
                    firmware_version: string | null;
                };
                vibrationReference: {
                    average_vibration: number | null;
                    min_vibration: number | null;
                    max_vibration: number | null;
                };
            }>(url);
            return response;
        } catch (error) {
            console.error('Error getting settings tab data:', error);
            throw error;
        }
    }
};
