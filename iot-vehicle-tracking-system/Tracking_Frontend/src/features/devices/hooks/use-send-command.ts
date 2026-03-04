import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import { notificationUtils } from '@/lib/notification';
import { queryInvalidation } from '@/lib/utils/query-invalidation';

const getErrorMessage = (error: any): string =>
  error?.response?.data?.error?.message ??
  error?.response?.data?.message ??
  error?.message ??
  'Không thể gửi lệnh';

export const useSendCommand = (deviceId: number | string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { command: string; params?: Record<string, unknown> }) =>
      deviceServices.sendCommand(deviceId, payload),
    onSuccess: () => {
      queryInvalidation.device.commands(queryClient, deviceId);
      notificationUtils.success('Đã gửi lệnh');
    },
    onError: (error: unknown) => {
      notificationUtils.error('Gửi lệnh thất bại', getErrorMessage(error));
    },
  });
};
