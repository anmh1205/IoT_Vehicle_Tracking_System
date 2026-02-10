import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import { toast } from 'sonner';

export const useCreateDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => deviceServices.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success('Đã tạo thiết bị');
    },
    onError: (error: any) => toast.error(error?.message ?? 'Không thể tạo thiết bị'),
  });
};

