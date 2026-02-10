import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';

export const useDeviceDetail = (id: number | null) =>
  useQuery({
    queryKey: ['device', id],
    queryFn: () => deviceServices.getById(id as number),
    enabled: id !== null,
  });
