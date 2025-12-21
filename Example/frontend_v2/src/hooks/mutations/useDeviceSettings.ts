import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceDetailServices } from '@/lib/api/deviceDetail';
import { notificationUtils } from '@/lib/notification';

export const useUpdateDeviceSettings = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ deviceId, settings }: { deviceId: string; settings: Partial<Device.DeviceSettings> }) =>
            deviceDetailServices.updateDeviceSettings(deviceId, settings),

        onSuccess: (data, variables) => {
            // Invalidate related queries to refetch new data
            queryClient.invalidateQueries({ queryKey: ['device', variables.deviceId] });
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });

            // Show success notification with detailed message
            let message = 'Cập nhật cài đặt thành công';
            if (variables.settings.vibration_threshold) {
                message = `Cập nhật ngưỡng kích hoạt thành công: ${variables.settings.vibration_threshold} mm/s`;
            } else if (variables.settings.request_interval) {
                message = `Cập nhật thời gian gửi dữ liệu thành công: ${variables.settings.request_interval} ms`;
            }
            notificationUtils.success(message);

            // Optimistic update - update UI immediately
            queryClient.setQueryData(
                ['device', variables.deviceId, 'detail'],
                (oldData: any) => {
                    if (!oldData) return oldData;
                    return {
                        ...oldData,
                        device: {
                            ...oldData.device,
                            ...variables.settings
                        }
                    };
                }
            );
        },

        onError: (error) => {
            // Show error notification
            notificationUtils.error('Không thể cập nhật cài đặt. Vui lòng thử lại.');
            console.error('Error updating device settings:', error);
        }
    });
};
