'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { Crosshair, Eye, EyeOff, Layers2, MapPinned, ScanSearch, Waypoints } from 'lucide-react';
import { useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { useMapStore } from '@/features/map/store/map-store';
import type { DevicePosition } from '@/features/map/types';
import { MapLayerSwitcher } from './map-layer-switcher';

export const MapControls = ({
  devices,
  geofenceWorkspaceOpen,
  geofenceWorkspaceDisabled = false,
  followModeEnabled,
  allowedZoneVisible,
  onToggleGeofenceWorkspace,
  onToggleAllowedZoneVisibility,
}: {
  devices: DevicePosition[];
  geofenceWorkspaceOpen: boolean;
  geofenceWorkspaceDisabled?: boolean;
  followModeEnabled: boolean;
  allowedZoneVisible: boolean;
  onToggleGeofenceWorkspace: () => void;
  onToggleAllowedZoneVisibility: () => void;
}) => {
  const map = useMap();
  const selectedDeviceId = useMapStore((state) => state.selectedDeviceId);
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
        <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/95 p-1.5 shadow-lg backdrop-blur">
          <MapLayerSwitcher />
          <div className="flex items-center gap-1 border-l border-border/60 pl-2">
            <Button
              size="icon"
              variant={followModeEnabled ? 'default' : 'ghost'}
              onClick={toggleFollowMode}
              className="h-8 w-8 rounded-xl"
              aria-pressed={followModeEnabled}
              aria-label={followModeEnabled ? 'Tắt theo dõi xe' : 'Bật theo dõi xe'}
              title="Theo dõi xe"
            >
              <Waypoints className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              size="icon"
              variant={geofenceWorkspaceOpen ? 'default' : 'ghost'}
              onClick={onToggleGeofenceWorkspace}
              className="h-8 w-8 rounded-xl"
              aria-pressed={geofenceWorkspaceOpen}
              aria-label={geofenceWorkspaceOpen ? 'Đóng panel vùng giám sát' : 'Mở panel vùng giám sát'}
              title="Vùng giám sát"
              disabled={geofenceWorkspaceDisabled}
            >
              <MapPinned className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              size="icon"
              variant={allowedZoneVisible ? 'default' : 'ghost'}
              onClick={onToggleAllowedZoneVisibility}
              className="h-8 w-8 rounded-xl"
              aria-pressed={allowedZoneVisible}
              aria-label={allowedZoneVisible ? 'Ẩn vùng giới hạn đang xem' : 'Hiện vùng giới hạn đang xem'}
              title={allowedZoneVisible ? 'Ẩn vùng giới hạn' : 'Hiện vùng giới hạn'}
            >
              {allowedZoneVisible ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-3 right-3 flex flex-col gap-2">
        <div className="grid gap-1 rounded-2xl border border-border/70 bg-background/95 p-1 shadow-lg backdrop-blur">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg"
            onClick={fitAllBounds}
            aria-label="Hiển thị toàn bộ thiết bị"
            title="Toàn bộ thiết bị"
          >
            <ScanSearch className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg"
            onClick={flyToSelected}
            disabled={!selectedDeviceId}
            aria-label="Di chuyển đến thiết bị đã chọn"
            title="Đến xe đang chọn"
          >
            <Crosshair className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            size="icon"
            variant={showGeofences ? 'default' : 'ghost'}
            className="h-8 w-8 rounded-lg"
            onClick={toggleGeofences}
            aria-pressed={showGeofences}
            aria-label={showGeofences ? 'Ẩn lớp vùng giám sát' : 'Hiện lớp vùng giám sát'}
            title="Lớp geofence"
          >
            <Layers2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
};
