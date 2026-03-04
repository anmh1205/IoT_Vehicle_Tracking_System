'use client';
import { Button } from '@/components/ui/button';
import { useMapStore } from '@/lib/stores/map-store';
export const MapToolbar = () => {
  const followMode = useMapStore((s) => s.followMode);
  const showGeofences = useMapStore((s) => s.showGeofences);
  const toggleFollowMode = useMapStore((s) => s.toggleFollowMode);
  const toggleGeofences = useMapStore((s) => s.toggleGeofences);
  return (
    <div className="absolute right-3 top-3 z-[1000] flex gap-2">
      <Button size="sm" variant={followMode ? 'default' : 'outline'} onClick={toggleFollowMode}>
        Theo dõi
      </Button>
      <Button size="sm" variant={showGeofences ? 'default' : 'outline'} onClick={toggleGeofences}>
        Vùng giám sát
      </Button>
    </div>
  );
};
