import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationServices } from '@/lib/api/notifications';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';

export const useMarkAllRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationServices.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      notificationUtils.success('Đã đánh dấu tất cả thông báo là đã đọc');
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Không thể đánh dấu thông báo',
        getApiErrorMessage(error, 'Lỗi không xác định'),
      );
    },
  });
};
