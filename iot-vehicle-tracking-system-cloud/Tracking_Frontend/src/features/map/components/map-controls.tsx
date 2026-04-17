'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { Crosshair, Layers2, MapPinned, ScanSearch, Waypoints } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMapStore } from '@/features/map/store/map-store';
import type { DevicePosition } from '@/features/map/types';
import { MapLayerSwitcher } from './map-layer-switcher';

export const MapControls = ({
  devices,
  geofenceWorkspaceOpen,
  onToggleGeofenceWorkspace,
}: {
  devices: DevicePosition[];
  geofenceWorkspaceOpen: boolean;
  onToggleGeofenceWorkspace: () => void;
}) => {
  const map = useMap();
  const selectedDeviceId = useMapStore((state) => state.selectedDeviceId);
  const followMode = useMapStore((state) => state.followMode);
  const toggleFollowMode = useMapStore((state) => state.toggleFollowMode);
  const showGeofences = useMapStore((state) => state.showGeofences);
  const toggleGeofences = useMapStore((state) => state.toggleGeofences);
  const setMapViewport = useMapStore((state) => state.setMapViewport);

  useEffect(() => {
    const onMoveEnd = () => {
      const center = map.getCenter();
      setMapViewport({ center: [center.lat, center.lng], zoom: map.getZoom() });
    };

    map.on('moveend', onMoveEnd);
    return () => {
      map.off('moveend', onMoveEnd);
    };
  }, [map, setMapViewport]);

  const fitAllBounds = () => {
    if (devices.length === 0) {
      return;
    }

    if (devices.length === 1) {
      const [device] = devices;
      map.flyTo([device.lat, device.lon], Math.max(map.getZoom(), 14), {
        animate: true,
        duration: 0.5,
      });
      return;
    }

    const bounds = L.latLngBounds(devices.map((device) => [device.lat, device.lon] as [number, number]));
    map.fitBounds(bounds.pad(0.2), { animate: true, duration: 0.5 });
  };

  const flyToSelected = () => {
    if (!selectedDeviceId) {
      return;
    }

    const selected = devices.find((device) => device.deviceId === selectedDeviceId);
    if (!selected) {
      return;
    }

    map.flyTo([selected.lat, selected.lon], Math.max(map.getZoom(), 14), {
      animate: true,
      duration: 0.6,
    });
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-[900]">
      <div className="pointer-events-auto absolute right-3 top-3 flex flex-col items-end gap-2">
        <MapLayerSwitcher />
        <div className="flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-background/95 p-2 shadow-lg backdrop-blur">
          <Button
            size="sm"
            variant={followMode ? 'default' : 'outline'}
            onClick={toggleFollowMode}
            className="h-9 px-3"
            aria-pressed={followMode}
          >
            <Waypoints className="mr-2 h-4 w-4" aria-hidden="true" />
            Theo dõi xe
          </Button>
          <Button
            size="sm"
            variant={geofenceWorkspaceOpen ? 'default' : 'outline'}
            onClick={onToggleGeofenceWorkspace}
            className="h-9 px-3"
            aria-pressed={geofenceWorkspaceOpen}
          >
            <MapPinned className="mr-2 h-4 w-4" aria-hidden="true" />
            Vùng giám sát
          </Button>
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-3 right-3 flex flex-col gap-2">
        <div className="grid gap-1 rounded-2xl border border-border/70 bg-background/95 p-1 shadow-lg backdrop-blur">
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 sm:h-9 sm:w-9"
            onClick={fitAllBounds}
            aria-label="Hiển thị toàn bộ thiết bị"
          >
            <ScanSearch className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 sm:h-9 sm:w-9"
            onClick={flyToSelected}
            disabled={!selectedDeviceId}
            aria-label="Di chuyển đến thiết bị đã chọn"
          >
            <Crosshair className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            size="icon"
            variant={showGeofences ? 'default' : 'ghost'}
            className="h-10 w-10 sm:h-9 sm:w-9"
            onClick={toggleGeofences}
            aria-pressed={showGeofences}
            aria-label={showGeofences ? 'Ẩn lớp vùng giám sát' : 'Hiện lớp vùng giám sát'}
          >
            <Layers2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
};
