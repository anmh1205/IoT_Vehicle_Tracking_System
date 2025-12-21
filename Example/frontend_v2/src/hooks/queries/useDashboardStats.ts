import { useQuery } from '@tanstack/react-query';
import { dashboardServices } from '@/lib/api/dashboard';

export const useDashboardStats = (enabled: boolean = true) => {
    return useQuery({
        queryKey: ['dashboard', 'stats'],
        queryFn: () => dashboardServices.getStats(),
        enabled,
        staleTime: 60000,
        // Retry on failure
        retry: 3,
        // Don't refetch when component mounts again if data is still fresh
        refetchOnMount: false,
    });
};
