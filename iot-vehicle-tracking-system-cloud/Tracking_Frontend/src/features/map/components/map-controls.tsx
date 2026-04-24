'use client';

import { useEffect, type CSSProperties } from 'react';
import L from 'leaflet';
import { Crosshair, Eye, EyeOff, Layers2, MapPinned, ScanSearch, Waypoints } from 'lucide-react';
import { useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { isMapEditMode, isMapInspectMode } from '@/features/map/lib/map-mode';
import { useMapStore } from '@/features/map/store/map-store';
import type { DevicePosition, MapHardMode } from '@/features/map/types';
import { MapLayerSwitcher } from './map-layer-switcher';

interface MapControlsProps {
  devices: DevicePosition[];
  hardMode: MapHardMode;
  followModeEnabled: boolean;
  allowedZoneVisible: boolean;
  canToggleAllowedZone: boolean;
  desktopRightOffset?: string;
  onToggleGeofenceWorkspace: () => void;
  onToggleAllowedZoneVisibility: () => void;
}

export const MapControls = ({
  devices,
  hardMode,
  followModeEnabled,
  allowedZoneVisible,
  canToggleAllowedZone,
  desktopRightOffset = '0.75rem',
  onToggleGeofenceWorkspace,
  onToggleAllowedZoneVisibility,
}: MapControlsProps) => {
  const map = useMap();
  const selectedDeviceId = useMapStore((state) => state.selectedDeviceId);
  const toggleFollowMode = useMapStore((state) => state.toggleFollowMode);
  const showGeofences = useMapStore((state) => state.showGeofences);
  const toggleGeofences = useMapStore((state) => state.toggleGeofences);
  const setMapViewport = useMapStore((state) => state.setMapViewport);
  const isInspectMode = isMapInspectMode(hardMode);
  const isGeofenceEditMode = hardMode === 'edit-geofence';
  const desktopOffsetStyle = {
    '--map-controls-right': desktopRightOffset,
  } as CSSProperties;

  useEffect(() => {
    let canSync = false;
    const enableSyncTimer = window.setTimeout(() => {
      canSync = true;
    }, 0);

    const syncViewport = () => {
      if (!canSync) {
        return;
      }

      const center = map.getCenter();
      const zoom = map.getZoom();

      if (
        !Number.isFinite(center.lat) ||
        !Number.isFinite(center.lng) ||
        !Number.isFinite(zoom)
      ) {
        return;
      }
      setMapViewport({ center: [center.lat, center.lng], zoom });
    };

    map.on('moveend', syncViewport);

    return () => {
      canSync = false;
      window.clearTimeout(enableSyncTimer);
      map.off('moveend', syncViewport);
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

    const bounds = L.latLngBounds(
      devices.map((device) => [device.lat, device.lon] as [number, number]),
    );
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
    <div className="pointer-events-none absolute inset-0 z-[920]">
      <div className="pointer-events-auto absolute right-3 top-3 flex flex-col items-end gap-2 md:right-[var(--map-controls-right)]" style={desktopOffsetStyle}>
        <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/95 p-1.5 shadow-lg backdrop-blur">
          <MapLayerSwitcher />
          <div className="flex items-center gap-1 border-l border-border/60 pl-2">
            {isInspectMode ? (
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
            ) : null}

            <Button
              size="icon"
              variant={isGeofenceEditMode ? 'default' : 'ghost'}
              onClick={onToggleGeofenceWorkspace}
              className="h-8 w-8 rounded-xl"
              aria-pressed={isGeofenceEditMode}
              aria-label={
                isGeofenceEditMode ? 'Đóng panel vùng giám sát' : 'Mở panel vùng giám sát'
              }
              title="Vùng giám sát"
            >
              <MapPinned className="h-4 w-4" aria-hidden="true" />
            </Button>

            {canToggleAllowedZone ? (
              <Button
                size="icon"
                variant={allowedZoneVisible ? 'default' : 'ghost'}
                onClick={onToggleAllowedZoneVisibility}
                className="h-8 w-8 rounded-xl"
                aria-pressed={allowedZoneVisible}
                aria-label={
                  allowedZoneVisible
                    ? 'Ẩn vùng cho phép đang xem'
                    : 'Hiện vùng cho phép đang xem'
                }
                title={allowedZoneVisible ? 'Ẩn vùng cho phép' : 'Hiện vùng cho phép'}
              >
                {allowedZoneVisible ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-3 right-3 flex flex-col gap-2 md:right-[var(--map-controls-right)]" style={desktopOffsetStyle}>
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
            variant={showGeofences || isGeofenceEditMode ? 'default' : 'ghost'}
            className="h-8 w-8 rounded-lg"
            onClick={toggleGeofences}
            disabled={isGeofenceEditMode || isMapEditMode(hardMode)}
            aria-pressed={showGeofences || isGeofenceEditMode}
            aria-label={
              showGeofences || isGeofenceEditMode
                ? 'Ẩn lớp vùng giám sát'
                : 'Hiện lớp vùng giám sát'
            }
            title="Lớp geofence"
          >
            <Layers2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
};
