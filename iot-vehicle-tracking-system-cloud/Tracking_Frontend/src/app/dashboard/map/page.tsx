'use client';

import { AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DeviceListPanel } from '@/features/map/components/device-list-panel';
import { MobileDeviceDrawer } from '@/features/map/components/mobile-device-drawer';
import { useDevicePositions } from '@/features/map/hooks/use-device-positions';
import { useMapRealtime } from '@/features/map/hooks/use-map-realtime';
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
  useMapRealtime();

  const mapErrorMessage = positionsQuery.isError
    ? getApiErrorMessage(
        positionsQuery.error,
        'Không thể tải vị trí thiết bị từ máy chủ. Vui lòng thử lại.',
      )
    : null;

  return (
    <section aria-label="Bản đồ theo dõi" className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <div className="hidden md:block md:w-[340px]">
          <DeviceListPanel />
        </div>
        <div className="relative min-w-0 flex-1">
          {mapErrorMessage ? (
            <div className="absolute left-3 right-3 top-3 z-[1200]">
              <Alert variant="destructive" className="border bg-background/95 shadow-lg backdrop-blur">
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
