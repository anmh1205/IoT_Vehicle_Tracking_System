import { useQuery } from '@tanstack/react-query';
import { firmwareServices } from '@/lib/api/firmware';

export function useFirmwareLogs(params?: Firmware.FirmwareLogsFilter, enabled: boolean = true) {
    return useQuery<{ items: Firmware.FirmwareAssignmentDto[]; total: number }>({
        queryKey: ['firmware', 'logs', params],
        queryFn: () => firmwareServices.logs(params),
        enabled,
        staleTime: 30_000,
    });
}
