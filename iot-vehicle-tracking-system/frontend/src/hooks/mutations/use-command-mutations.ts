/**
 * Command Mutation Hooks
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commandServices } from '@/lib/api/commands';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { toast } from 'sonner';
import type { SendCommandDto } from '@/types';

export function useSendCommand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deviceId, data }: { deviceId: string; data: SendCommandDto }) =>
      commandServices.send(deviceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMMANDS });
      toast.success('Command sent successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to send command', { description: error.message });
    },
  });
}

