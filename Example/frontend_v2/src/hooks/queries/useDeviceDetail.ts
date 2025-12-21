import { useQuery } from '@tanstack/react-query';
import { deviceDetailServices } from '@/lib/api/deviceDetail';
import { STALE_TIMES } from '@/lib/constants/queryCache';

export const useDeviceDetail = (deviceId: string, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['device', deviceId, 'detail'],
        queryFn: () => deviceDetailServices.getOverviewData(deviceId),
        enabled: !!deviceId && enabled,
        staleTime: STALE_TIMES.DEVICE_DETAIL,
        retry: 3,
        refetchOnMount: false,
    });
};
