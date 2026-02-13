import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import { notificationUtils } from '@/lib/notification';
import { queryInvalidation } from '@/lib/utils/query-invalidation';

const getErrorMessage = (error: any): string =>
  error?.response?.data?.error?.message ??
  error?.response?.data?.message ??
  error?.message ??
  'Không thể tạo thiết bị';

export const useCreateDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => deviceServices.create(payload),
    onSuccess: () => {
      queryInvalidation.device.list(queryClient);
      notificationUtils.success('Đã tạo thiết bị');
    },
    onError: (error: unknown) => {
      notificationUtils.error('Tạo thiết bị thất bại', getErrorMessage(error));
    },
  });
};
