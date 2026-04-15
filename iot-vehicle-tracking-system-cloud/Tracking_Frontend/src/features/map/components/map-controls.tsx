'use client';
import { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { Crosshair, Layers2, Minus, Plus, ScanSearch, Waypoints } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMapStore } from '@/features/map/store/map-store';
import type { DevicePosition } from '@/features/map/types';
import { MapLayerSwitcher } from './map-layer-switcher';
export const MapControls = ({ devices }: { devices: DevicePosition[] }) => {
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
    <div className="pointer-events-auto absolute right-3 top-3 z-[900] flex flex-col items-end gap-2">
      <MapLayerSwitcher />

      <div className="grid gap-1 rounded-xl border border-border/70 bg-background/95 p-1 shadow-lg backdrop-blur">
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 sm:h-9 sm:w-9"
          onClick={() => map.zoomIn()}
          aria-label="Phóng to bản đồ"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 sm:h-9 sm:w-9"
          onClick={() => map.zoomOut()}
          aria-label="Thu nhỏ bản đồ"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>
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
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-background/95 p-2 shadow-lg backdrop-blur sm:flex-row">
        <Button
          size="sm"
          variant={followMode ? 'default' : 'outline'}
          onClick={toggleFollowMode}
          className="h-10 justify-start px-3 sm:h-9"
          aria-pressed={followMode}
        >
          <Waypoints className="mr-1 h-4 w-4" aria-hidden="true" />
          Theo dõi
        </Button>
        <Button
          size="sm"
          variant={showGeofences ? 'default' : 'outline'}
          onClick={toggleGeofences}
          className="h-10 justify-start px-3 sm:h-9"
          aria-pressed={showGeofences}
        >
          <Layers2 className="mr-1 h-4 w-4" aria-hidden="true" />
          Vùng địa lý
        </Button>
      </div>
    </div>
  );
};
