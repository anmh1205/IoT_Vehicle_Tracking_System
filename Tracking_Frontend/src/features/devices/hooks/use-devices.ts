import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import type { DeviceFilters } from '@/lib/api/devices';

export const useDevices = (filters?: DeviceFilters) =>
  useQuery({
    queryKey: ['devices', filters],
    queryFn: () => deviceServices.getList(filters),
  });
