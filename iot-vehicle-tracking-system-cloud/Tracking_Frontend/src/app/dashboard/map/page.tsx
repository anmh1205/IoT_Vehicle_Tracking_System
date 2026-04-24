'use client';

import { AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DeviceListPanel } from '@/features/map/components/device-list-panel';
import { MobileDeviceDrawer } from '@/features/map/components/mobile-device-drawer';
import { useDevicePositions } from '@/features/map/hooks/use-device-positions';
import { useMapRealtime } from '@/features/map/hooks/use-map-realtime';
import { useMapUrlSync } from '@/features/map/hooks/use-map-url-sync';
import { isMapBrowsePanelMode } from '@/features/map/lib/map-mode';
import { useMapStore } from '@/features/map/store/map-store';
import { getApiErrorMessage } from '@/lib/utils/api-error';

const TrackingMap = dynamic(
  () => import('@/features/map/components/tracking-map').then((module) => module.TrackingMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
  },
);

const MapPage = () => {
  const positionsQuery = useDevicePositions();
  const hardMode = useMapStore((state) => state.hardMode);
  const showDesktopBrowsePanel = isMapBrowsePanelMode(hardMode);

  useMapRealtime();
  useMapUrlSync();

  const mapErrorMessage = positionsQuery.isError
    ? getApiErrorMessage(
        positionsQuery.error,
        'Không thể tải vị trí thiết bị từ máy chủ. Vui lòng thử lại.',
      )
    : null;

  return (
    <section
      id="main-content"
      aria-label="Bản đồ theo dõi"
      className="flex min-h-0 flex-1 overflow-hidden"
    >
      <div className="flex min-h-0 flex-1">
        {showDesktopBrowsePanel ? (
          <div className="hidden md:block md:w-[min(26vw,340px)]">
            <DeviceListPanel />
          </div>
        ) : null}

        <div className="relative min-w-0 flex-1">
          {mapErrorMessage ? (
            <div className="absolute left-3 right-3 top-3 z-[1200] md:max-w-[34rem]">
              <Alert
                variant="destructive"
                className="border bg-background/95 shadow-lg backdrop-blur"
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Không thể đồng bộ dữ liệu bản đồ</AlertTitle>
                <AlertDescription>
                  <p>{mapErrorMessage}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      void positionsQuery.refetch();
                    }}
                    disabled={positionsQuery.isFetching}
                  >
                    Thử lại
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          ) : null}

          <TrackingMap />
          <MobileDeviceDrawer />
        </div>
      </div>
    </section>
  );
};

export default MapPage;
