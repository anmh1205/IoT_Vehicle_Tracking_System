import { useQuery } from '@tanstack/react-query';
import { firmwareServices } from '@/lib/api/firmware';

export function useFirmwareList(enabled: boolean = true) {
    return useQuery<Firmware.FirmwareDto[]>({
        queryKey: ['firmware', 'list'],
        queryFn: () => firmwareServices.list(),
        enabled,
        staleTime: 60_000,
    });
}
