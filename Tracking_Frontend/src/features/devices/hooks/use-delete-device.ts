import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import { toast } from 'sonner';

export const useDeleteDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deviceServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success('Đã xóa thiết bị');
    },
    onError: (error: any) => toast.error(error?.message ?? 'Không thể xóa thiết bị'),
  });
};

