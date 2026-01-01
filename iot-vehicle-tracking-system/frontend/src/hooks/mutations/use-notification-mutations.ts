/**
 * Notification Mutation Hooks
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationServices } from '@/lib/api/notifications';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { toast } from 'sonner';

export function useMarkNotificationDelivered() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number | string) => notificationServices.markDelivered(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
            toast.success('Notification marked as delivered');
        },
        onError: (error: Error) => {
            toast.error('Failed to mark notification', { description: error.message });
        },
    });
}

export function useRetryNotification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number | string) => notificationServices.retry(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
            toast.success('Notification retry scheduled');
        },
        onError: (error: Error) => {
            toast.error('Failed to retry notification', { description: error.message });
        },
    });
}
