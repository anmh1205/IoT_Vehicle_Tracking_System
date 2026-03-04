import { useQuery } from '@tanstack/react-query';
import { geofenceServices } from '@/lib/api/geofences';

export const useGeofences = () =>
  useQuery({
    queryKey: ['map-geofences'],
    queryFn: () => geofenceServices.getList({ limit: 500 }),
  });
