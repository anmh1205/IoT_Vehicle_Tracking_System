import { useQuery } from '@tanstack/react-query';
import { deviceDetailServices } from '@/lib/api/deviceDetail';
import { STALE_TIMES } from '@/lib/constants/queryCache';

export const useDeviceSessions = (deviceId: string, page: number = 1, limit: number = 10, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['device', deviceId, 'sessions', { page, limit }],
        queryFn: () => deviceDetailServices.getSessionsTabData(deviceId, page, limit),
        enabled: !!deviceId && enabled,
        staleTime: STALE_TIMES.DEVICE_SESSIONS,
        retry: 3,
        refetchOnMount: false,
    });
};
