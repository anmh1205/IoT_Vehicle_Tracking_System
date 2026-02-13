import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import { notificationUtils } from '@/lib/notification';
import { queryInvalidation } from '@/lib/utils/query-invalidation';

const getErrorMessage = (error: any): string =>
  error?.response?.data?.error?.message ??
  error?.response?.data?.message ??
  error?.message ??
  'Không thể cập nhật thiết bị';

export const useUpdateDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Record<string, unknown>) =>
      deviceServices.update(id, payload),
    onSuccess: (_result, variables) => {
      queryInvalidation.device.all(queryClient, variables.id);
      notificationUtils.success('Đã cập nhật thiết bị');
    },
    onError: (error: unknown) => {
      notificationUtils.error('Cập nhật thiết bị thất bại', getErrorMessage(error));
    },
  });
};
