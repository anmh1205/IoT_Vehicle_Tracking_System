import { http } from './http';
import { API } from './endpoints';
import { notificationUtils } from '@/lib/notification';

export const firmwareServices = {
    list: () =>
        http.get<{ firmwares: Firmware.FirmwareDto[] }>(API.FIRMWARE.LIST)
            .then(r => r.firmwares),

    upload: async (file: File, firmwareName?: string, version?: string) => {
        try {
            const formData = new FormData();
            formData.append('firmware', file);
            if (firmwareName) {
                formData.append('firmware_name', firmwareName);
            }
            if (version) {
                formData.append('version', version);
            }

            // Use multipart/form-data helper to avoid JSON.stringify(FormData)
            const result = await http.postForm<unknown>(API.FIRMWARE.UPLOAD, formData);

            notificationUtils.success(
                'Tải lên firmware thành công',
                `Firmware ${firmwareName || file.name} đã được tải lên thành công`
            );

            return result;
        } catch (error) {
            notificationUtils.error(
                'Lỗi tải lên firmware',
                'Không thể tải lên firmware. Vui lòng kiểm tra file và thử lại.'
            );
            throw error;
        }
    },

    delete: async (firmwareVersion: string) => {
        try {
            const result = await http.delete<unknown>(API.FIRMWARE.DELETE, { firmware_version: firmwareVersion });

            notificationUtils.success(
                'Xóa firmware thành công',
                'Firmware đã được xóa thành công'
            );

            return result;
        } catch (error) {
            notificationUtils.error(
                'Lỗi xóa firmware',
                'Không thể xóa firmware. Vui lòng thử lại.'
            );
            throw error;
        }
    },

    activate: async (firmwareVersion: string) => {
        try {
            const result = await http.post<unknown>(API.FIRMWARE.ACTIVATE, { firmware_version: firmwareVersion });
            notificationUtils.success('Đặt làm firmware stable', 'Firmware đã được đặt làm phiên bản stable');
            return result;
        } catch (error) {
            notificationUtils.error('Lỗi đặt firmware', 'Không thể đặt firmware làm phiên bản stable, vui lòng thử lại');
            throw error;
        }
    },

    assign: async (device_id: string, firmware_version: string | null, firmware_mode: 'stable' | 'fixed' = 'fixed') => {
        try {
            const result = await http.post<Firmware.FirmwareAssignmentDto>(API.FIRMWARE.ASSIGN, {
                device_id,
                firmware_version: firmware_version ?? null,
                firmware_mode
            });
            notificationUtils.success('Tạo gán firmware', `Đã tạo lệnh cập nhật firmware cho thiết bị ${device_id}`);
            return result;
        } catch (error) {
            notificationUtils.error('Lỗi gán firmware', 'Không thể gán firmware cho thiết bị này');
            throw error;
        }
    },

    assignments: async (params?: Firmware.FirmwareFilter) => {
        const qs = new URLSearchParams();
        if (params?.device_id) qs.set('device_id', params.device_id);
        if (params?.status) qs.set('status', params.status);
        if (params?.page) qs.set('page', String(params.page));
        if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
        const url = `${API.FIRMWARE.ASSIGNMENTS}${qs.toString() ? `?${qs.toString()}` : ''}`;
        const res = await http.get<{ items: Firmware.FirmwareAssignmentDto[]; total: number }>(url);
        return res;
    },

    cancel: async (id: number) => {
        try {
            const result = await http.post<unknown>(API.FIRMWARE.CANCEL, { id });
            notificationUtils.success('Đã hủy lệnh cập nhật', 'Lệnh cập nhật firmware đã được hủy');
            return result;
        } catch (error) {
            notificationUtils.error('Lỗi hủy lệnh', 'Không thể hủy lệnh cập nhật này');
            throw error;
        }
    },

    logs: async (params?: Firmware.FirmwareLogsFilter) => {
        const qs = new URLSearchParams();
        if (params?.device_id) qs.set('device_id', params.device_id);
        if (params?.status) qs.set('status', params.status);
        if (params?.from) qs.set('from', params.from);
        if (params?.to) qs.set('to', params.to);
        if (params?.page) qs.set('page', String(params.page));
        if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
        const url = `${API.FIRMWARE.LOGS}${qs.toString() ? `?${qs.toString()}` : ''}`;
        const res = await http.get<{ items: Firmware.FirmwareAssignmentDto[]; total: number }>(url);
        return res;
    },

    deleteLog: async (id: number) => {
        try {
            const result = await http.delete<unknown>(API.FIRMWARE.DELETE_LOG, { id });
            notificationUtils.success('Đã xóa log', 'Log cập nhật firmware đã được xóa');
            return result;
        } catch (error) {
            notificationUtils.error('Lỗi xóa log', 'Không thể xóa log này');
            throw error;
        }
    },

    devices: async () => {
        const res = await http.get<{
            devices: Array<{
                device_id: string;
                device_name: string;
                current_status: string | null;
                firmware_version: string | null;
                firmware_mode: 'stable' | 'fixed';
                target_firmware_version: string | null;
                last_seen_at: string | null;
                request_interval: number | null;
            }>
        }>(API.FIRMWARE.DEVICES);
        return res.devices;
    }
};
