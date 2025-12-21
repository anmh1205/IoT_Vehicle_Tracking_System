import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/device';
import { notificationUtils } from '@/lib/notification';

export const useDeviceUpdate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { deviceId: string; updates: { device_name?: string; device_id?: string } }) =>
            deviceServices.update(data.deviceId, data.updates),
        onSuccess: (data, variables) => {
            // Invalidate device list queries
            queryClient.invalidateQueries({ queryKey: ['devices', 'list'] });

            // If device_id was changed, invalidate both old and new device detail queries
            if (variables.updates.device_id && variables.updates.device_id !== variables.deviceId) {
                // Invalidate old device detail query
                queryClient.invalidateQueries({ queryKey: ['device', variables.deviceId, 'detail'] });
                // Invalidate new device detail query
                queryClient.invalidateQueries({ queryKey: ['device', variables.updates.device_id, 'detail'] });
                // Invalidate old device sessions query
                queryClient.invalidateQueries({ queryKey: ['device', variables.deviceId, 'sessions'] });
                // Invalidate new device sessions query
                queryClient.invalidateQueries({ queryKey: ['device', variables.updates.device_id, 'sessions'] });
            } else {
                // No device_id change, just invalidate current device queries
                queryClient.invalidateQueries({ queryKey: ['device', variables.deviceId, 'detail'] });
                queryClient.invalidateQueries({ queryKey: ['device', variables.deviceId, 'sessions'] });
            }

            // Show success notification
            notificationUtils.success('Cập nhật thông tin thiết bị thành công');
        },
        onError: (error) => {
            console.error('Error updating device:', error);
            notificationUtils.error('Không thể cập nhật thông tin thiết bị. Vui lòng thử lại.');
        }
    });
};
