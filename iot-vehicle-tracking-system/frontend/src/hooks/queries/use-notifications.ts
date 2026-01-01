/**
 * useNotifications Hook - Fetch notifications list
 */
import { useQuery } from '@tanstack/react-query';
import { notificationServices } from '@/lib/api/notifications';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { STALE_TIMES } from '@/lib/constants/query-cache';
import type { QueryNotificationDto } from '@/types';

export function useNotifications(params?: QueryNotificationDto, enabled: boolean = true) {
    return useQuery({
        queryKey: [...QUERY_KEYS.NOTIFICATIONS, params],
        queryFn: () => notificationServices.list(params),
        enabled,
        staleTime: STALE_TIMES.VEHICLE_LIST,
    });
}

export function useNotification(id: number | string | undefined) {
    return useQuery({
        queryKey: [...QUERY_KEYS.NOTIFICATIONS, id],
        queryFn: () => notificationServices.getById(id!),
        enabled: !!id,
        staleTime: STALE_TIMES.VEHICLE_LIST,
    });
}
