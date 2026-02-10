import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import { toast } from 'sonner';

export const useUpdateDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Record<string, unknown>) =>
      deviceServices.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success('Đã cập nhật thiết bị');
    },
    onError: (error: any) => toast.error(error?.message ?? 'Không thể cập nhật thiết bị'),
  });
};

