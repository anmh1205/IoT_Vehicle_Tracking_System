import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import { toast } from 'sonner';

export const useSendCommand = (deviceId: number | string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { command: string; params?: Record<string, unknown> }) =>
      deviceServices.sendCommand(deviceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-commands', deviceId] });
      toast.success('Da gui lenh');
    },
    onError: (error: any) => toast.error(error?.message ?? 'Không thể gửi lệnh'),
  });
};

