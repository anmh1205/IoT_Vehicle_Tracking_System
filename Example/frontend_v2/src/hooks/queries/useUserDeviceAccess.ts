import { useQuery } from '@tanstack/react-query';
import { userServices } from '@/lib/api/users';

export const useUserDeviceAccess = (userId: string | null | undefined) => {
  return useQuery({
    queryKey: ['user', userId, 'device-access'],
    queryFn: () => userServices.getDeviceAccess(userId as string),
    enabled: !!userId,
    staleTime: 60_000
  });
};


