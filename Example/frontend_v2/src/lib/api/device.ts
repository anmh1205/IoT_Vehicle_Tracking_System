import { http } from './http';
import { API } from './endpoints';
import { notificationUtils } from '@/lib/notification';
import { resolveDeviceStatus } from '@/lib/utils/device-status';

export const deviceServices = {
    list: (params?: Device.DeviceFilter) => {
        const query = params
            ? new URLSearchParams(
                Object.entries(params)
                    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
                    .map(([k, v]) => [k, String(v)])
            ).toString()
            : '';

        const url = API.DEVICE.LIST + (query ? `?${query}` : '');
        return http
            .get<any>(url)
            .then(rawResponse => {
                const raw = rawResponse.devices ?? rawResponse.data?.devices ?? [];
                // Backend already resolves status with request_interval-based timeout
                // Use status directly from backend response
                const mapped: Device.DeviceDto[] = raw.map((d: any) => {
                    return {
                        device_id: d.deviceId ?? d.device_id ?? '',
                        device_name: d.deviceName ?? d.device_name ?? 'Unnamed',
                        current_status: (d.currentStatus ?? d.status ?? null) as Device.DeviceDto['current_status'],
                        last_seen_at: d.lastSeenAt ?? d.last_seen_at ?? null,
                        total_runtime_seconds: d.totalRuntimeSeconds ?? d.total_runtime_seconds ?? 0,
                        quarter_runtime_seconds: d.quarterRuntimeSeconds ?? d.quarter_runtime_seconds ?? 0,
                        request_interval: d.requestInterval ?? d.request_interval ?? null,
                    };
                });
                return mapped;
            });
    },
    details: (deviceId: string) =>
        http.get<{ device: Device.DeviceDetailDto; recentSessions: Device.SessionDto[] }>(API.DEVICE.DETAILS(deviceId)),
    vibrationThreshold: (deviceId: string) =>
        http.get<{ vibrationThreshold: number | null }>(API.DEVICE.VIBRATION_THRESHOLD(deviceId))
            .then(r => r.vibrationThreshold),
    sessions: (deviceId: string, params?: { period?: string; status?: string; limit?: number }) =>
        http.get<{ sessions: Device.SessionDto[] }>(
            API.DEVICE.SESSIONS(deviceId) +
                (params ? `&${new URLSearchParams(params as Record<string, string>).toString()}` : '')
        ).then(r => r.sessions),
    analytics: (deviceId: string, range: string) => {
        const base = API.DEVICE.ANALYTICS(deviceId);
        let daysParam: string | undefined;
        if (range === '7d') daysParam = '7';
        else if (range === '30d') daysParam = '30';
        else if (range === '90d') daysParam = '90';
        const url = daysParam ? `${base}&days=${daysParam}` : base;
        return http.get<{
            device: { device_id: string; device_name: string } | null;
            days: number;
            startDate: string;
            series: Array<{
                id: string;
                label: string;
                points: Array<{ x: string; y: number }>;
            }>;
            totalSeconds: number;
            maxSeconds: number;
        }>(url);
    },
    create: async (params: Device.CreateDeviceRequest) => {
        try {
            const result = await http.post<unknown>(API.DEVICE.MANAGE, params);
            notificationUtils.success(
                'Tạo thiết bị thành công',
                `Thiết bị ${params.device_name} đã được tạo thành công`
            );
            return result;
        } catch (error) {
            notificationUtils.error(
                'Lỗi tạo thiết bị',
                'Không thể tạo thiết bị mới. Vui lòng thử lại.'
            );
            throw error;
        }
    },
    update: async (deviceId: string, params: Device.UpdateDeviceRequest) => {
        try {
            const updatePayload: any = { device_id: deviceId };

            // Handle device_id update separately as new_device_id
            if (params.device_id && params.device_id !== deviceId) {
                updatePayload.new_device_id = params.device_id;
            }

            // Add other fields
            if (params.device_name !== undefined) {
                updatePayload.device_name = params.device_name;
            }
            if (params.vibration_threshold !== undefined) {
                updatePayload.vibration_threshold = params.vibration_threshold;
            }

            const result = await http.put<unknown>(API.DEVICE.MANAGE, updatePayload);
            notificationUtils.success(
                'Cập nhật thiết bị thành công',
                `Thiết bị ${deviceId} đã được cập nhật thành công`
            );
            return result;
        } catch (error) {
            notificationUtils.error(
                'Lỗi cập nhật thiết bị',
                'Không thể cập nhật thiết bị. Vui lòng thử lại.'
            );
            throw error;
        }
    },
    delete: async (deviceId: string) => {
        try {
            // Gửi payload JSON để thống nhất với create/update
            const result = await http.delete<unknown>(API.DEVICE.MANAGE, { device_id: deviceId });
            notificationUtils.success(
                'Xóa thiết bị thành công',
                `Thiết bị ${deviceId} đã được xóa thành công`
            );
            return result;
        } catch (error) {
            notificationUtils.error(
                'Lỗi xóa thiết bị',
                'Không thể xóa thiết bị. Vui lòng thử lại.'
            );
            throw error;
        }
    },
    sendRawData: async (data: {
        device_id: string;
        vibration?: number;
        vibration_value?: number;
        battery?: number;
        battery_top?: number;
        battery_bot?: number;
        ac_power?: boolean;
        error_code?: number;
        timestamp?: string;
        status?: string;
    }) => {
        try {
            // Convert simulator format to backend format
            // Backend expects: vibration_value (required), battery_top/battery_bot (optional)
            const payload: Record<string, string> = {
                device_id: data.device_id
            };

            // Handle vibration: prefer vibration_value, fallback to vibration
            if (data.vibration_value !== undefined) {
                payload.vibration_value = String(data.vibration_value);
            } else if (data.vibration !== undefined) {
                payload.vibration_value = String(data.vibration);
            }

            // Handle battery: split into battery_top and battery_bot if only battery is provided
            if (data.battery_top !== undefined) {
                payload.battery_top = String(data.battery_top);
            }
            if (data.battery_bot !== undefined) {
                payload.battery_bot = String(data.battery_bot);
            } else if (data.battery !== undefined && data.battery_top === undefined) {
                // If only battery is provided, split it roughly in half (simulator behavior)
                const batteryTotal = Math.max(0, data.battery);
                const batteryTop = Math.round((batteryTotal / 2) * 100) / 100;
                const batteryBot = Math.round((batteryTotal - batteryTop) * 100) / 100;
                payload.battery_top = String(batteryTop);
                payload.battery_bot = String(batteryBot);
            }

            // Handle ac_power: convert boolean to string
            if (data.ac_power !== undefined) {
                payload.ac_power = data.ac_power ? '1' : '0';
            }

            // Handle error_code
            if (data.error_code !== undefined) {
                payload.error_code = String(data.error_code);
            }

            // Handle timestamp: convert ISO string to Unix timestamp (seconds) if needed
            if (data.timestamp) {
                // Backend accepts both ISO string and Unix timestamp (seconds)
                payload.timestamp = data.timestamp;
            }

            // Handle status (for stop signal)
            if (data.status === 'stopped') {
                // For stop signal, send vibration_value = 0
                payload.vibration_value = '0';
            }

            // Convert payload to query string
            const queryParams = new URLSearchParams();
            Object.entries(payload).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    queryParams.append(key, String(value));
                }
            });

            // Send as query string instead of JSON body
            const url = `${API.DEVICE.RAWDATA}?${queryParams.toString()}`;
            // Use request directly with empty body to send query string only
            const result = await http.put<{ stt: number; msg: number }>(url, undefined);
            
            // Check response status
            if (result.stt === -1) {
                const errorMessages: Record<number, string> = {
                    1: 'Thiếu device_id',
                    2: 'Device không tồn tại',
                    3: 'Thiếu vibration_value',
                    9: 'Lỗi server'
                };
                const errorMsg = errorMessages[result.msg] || `Lỗi không xác định (code: ${result.msg})`;
                throw new Error(errorMsg);
            }

            return result;
        } catch (error) {
            throw error;
        }
    },
};
