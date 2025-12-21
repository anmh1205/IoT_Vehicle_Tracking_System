import { useQuery } from '@tanstack/react-query';
import { dashboardServices } from '@/lib/api/dashboard';

export const useAlerts = (enabled: boolean = true) => {
    return useQuery({
        queryKey: ['dashboard', 'alerts'],
        queryFn: () => dashboardServices.getAlerts(),
        enabled,
        staleTime: 45000,
        retry: 3,
        refetchOnMount: false,
    });
};
