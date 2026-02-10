'use client';

import dynamic from 'next/dynamic';
import { useDevicePositions } from '@/features/map/hooks/use-device-positions';
import { useMapRealtime } from '@/features/map/hooks/use-map-realtime';
import { MapSidebar } from '@/features/map/components/map-sidebar';
import { MapToolbar } from '@/features/map/components/map-toolbar';

const MapView = dynamic(() => import('@/features/map/components/map-view').then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="flex-1 animate-pulse bg-muted" />,
});

export default function MapPage() {
  useDevicePositions();
  useMapRealtime();

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <MapSidebar />
      <div className="relative flex-1">
        <MapView />
        <MapToolbar />
      </div>
    </div>
  );
}
