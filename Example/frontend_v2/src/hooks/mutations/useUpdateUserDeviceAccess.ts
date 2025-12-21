import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userServices } from '@/lib/api/users';

interface Payload {
  userId: string;
  mode: 'all' | 'custom';
  deviceIds?: string[];
}

export const useUpdateUserDeviceAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, mode, deviceIds }: Payload) =>
      userServices.updateDeviceAccess(userId, { mode, deviceIds }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['user', variables.userId, 'device-access'] });
    }
  });
};


