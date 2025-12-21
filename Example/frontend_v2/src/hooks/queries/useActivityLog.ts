import { useQuery } from '@tanstack/react-query';
import { dashboardServices } from '@/lib/api/dashboard';

export const useActivityLog = (enabled: boolean = true) => {
    return useQuery({
        queryKey: ['dashboard', 'activity'],
        queryFn: () => dashboardServices.getActivity(),
        enabled,
        staleTime: 30000,
        retry: 3,
        refetchOnMount: false,
    });
};
