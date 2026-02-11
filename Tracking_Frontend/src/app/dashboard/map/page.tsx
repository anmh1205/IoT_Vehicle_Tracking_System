'use client';
import dynamic from 'next/dynamic';
import { useDevicePositions } from '@/features/map/hooks/use-device-positions';
import { useMapRealtime } from '@/features/map/hooks/use-map-realtime';
import { DeviceListPanel } from '@/features/map/components/device-list-panel';
import { MobileDeviceDrawer } from '@/features/map/components/mobile-device-drawer';
const TrackingMap = dynamic(
  () => import('@/features/map/components/tracking-map').then((module) => module.TrackingMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
  },
);
const MapPage = () => {
  useDevicePositions();
  useMapRealtime();
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="hidden md:block">
        <DeviceListPanel />
      </div>
      <div className="relative flex-1">
        <TrackingMap />
        <MobileDeviceDrawer />
      </div>
    </div>
  );
};
export default MapPage;
