import { useQuery } from '@tanstack/react-query';
import { deviceDetailServices } from '@/lib/api/deviceDetail';
import { STALE_TIMES } from '@/lib/constants/queryCache';

export const useDeviceErrorCodes = (
    deviceId: string,
    page: number = 1,
    limit: number = 10,
    status: string = 'all',
    type: string = 'all',
    enabled: boolean = true
) => {
    return useQuery({
        queryKey: ['device', deviceId, 'error-codes', { page, limit, status, type }],
        queryFn: () => deviceDetailServices.getErrorCodes(deviceId, page, limit, status, type),
        enabled: !!deviceId && enabled,
        staleTime: STALE_TIMES.DEVICE_ERROR_CODES,
        retry: 3,
        refetchOnMount: false,
    });
};
