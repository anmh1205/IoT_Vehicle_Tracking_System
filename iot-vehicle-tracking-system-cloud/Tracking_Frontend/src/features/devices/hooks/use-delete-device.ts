import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import { notificationUtils } from '@/lib/notification';
import { queryInvalidation } from '@/lib/utils/query-invalidation';
import { getApiErrorMessage } from '@/lib/utils/api-error';

export const useDeleteDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deviceServices.delete(id),
    onSuccess: (_result, id) => {
      queryInvalidation.device.all(queryClient, id);
      notificationUtils.success('Đã xóa thiết bị');
    },
    onError: (error: unknown) => {
      notificationUtils.error('Xóa thiết bị thất bại', getApiErrorMessage(error, 'Không thể xóa thiết bị'));
    },
  });
};
