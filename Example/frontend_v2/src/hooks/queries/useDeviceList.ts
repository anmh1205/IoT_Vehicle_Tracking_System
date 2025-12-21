import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/device';
import { getCurrentQuarterBounds } from '@/lib/utils/date/ranges';
import { STALE_TIMES } from '@/lib/constants/queryCache';

export const useDeviceList = (enabled: boolean = true) => {
    return useQuery({
        queryKey: ['devices', 'list'],
        queryFn: () => {
            // Calculate quarter bounds on client-side
            const quarterBounds = getCurrentQuarterBounds();
            return deviceServices.list({
                quarterStartDate: quarterBounds.start.toISOString(),
                quarterEndDate: quarterBounds.end.toISOString()
            });
        },
        enabled,
        staleTime: STALE_TIMES.DEVICE_LIST,
        retry: 3,
        refetchOnMount: false,
    });
};
