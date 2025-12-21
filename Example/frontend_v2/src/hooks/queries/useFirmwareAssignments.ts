import { useQuery } from '@tanstack/react-query';
import { firmwareServices } from '@/lib/api/firmware';

export function useFirmwareAssignments(params?: Firmware.FirmwareFilter, enabled: boolean = true) {
    return useQuery<{ items: Firmware.FirmwareAssignmentDto[]; total: number }>({
        queryKey: ['firmware', 'assignments', params],
        queryFn: () => firmwareServices.assignments(params),
        enabled,
        staleTime: 30_000,
    });
}
