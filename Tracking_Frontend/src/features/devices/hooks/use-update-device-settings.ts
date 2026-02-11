import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceDetailServices } from '@/lib/api/device-detail';
import { notificationUtils } from '@/lib/notification';
import { queryInvalidation } from '@/lib/utils/query-invalidation';
const getErrorMessage = (error: any): string =>
  error?.response?.data?.error?.message ??
  error?.response?.data?.message ??
  error?.message ??
  'Không thể cập nhật cài đặt thiết bị';
export const useUpdateDeviceSettings = (deviceId: number | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      deviceDetailServices.updateSettings(deviceId as number, payload),
    onSuccess: () => {
      if (!deviceId) return;
      queryInvalidation.device.all(queryClient, deviceId);
      notificationUtils.success('Đã cập nhật cài đặt thiết bị');
    },
    onError: (error: unknown) => {
      notificationUtils.error('Cập nhật thất bại', getErrorMessage(error));
    },
  });
};
