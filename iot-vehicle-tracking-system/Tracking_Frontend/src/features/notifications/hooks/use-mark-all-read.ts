import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationServices } from '@/lib/api/notifications';
import { notificationUtils } from '@/lib/notification';
export const useMarkAllRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationServices.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      notificationUtils.success('Marked all notifications as read');
    },
    onError: (error: any) => {
      notificationUtils.error(
        'Failed to mark notifications',
        error?.response?.data?.message ?? error?.message ?? 'Unknown error',
      );
    },
  });
};
