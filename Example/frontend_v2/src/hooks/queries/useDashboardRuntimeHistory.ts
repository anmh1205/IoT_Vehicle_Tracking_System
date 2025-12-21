import { useQuery } from '@tanstack/react-query';
import { dashboardServices } from '@/lib/api/dashboard';

export const useDashboardRuntimeHistory = (range: 7 | 30 | 90) => {
    return useQuery({
        queryKey: ['dashboard', 'runtime-history', range],
        queryFn: () => dashboardServices.getStats(range),
        staleTime: 60000,
        retry: 3,
        refetchOnMount: false,
    });
};
