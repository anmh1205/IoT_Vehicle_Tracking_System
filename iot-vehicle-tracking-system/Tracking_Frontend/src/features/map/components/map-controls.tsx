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

      <div className="grid gap-1 rounded-md border bg-background/90 p-1 backdrop-blur">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => map.zoomIn()}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => map.zoomOut()}>
          <Minus className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={fitAllBounds}>
          <ScanSearch className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={flyToSelected}>
          <Crosshair className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={followMode ? 'default' : 'outline'}
          onClick={toggleFollowMode}
          className="h-8"
        >
          <Waypoints className="mr-1 h-4 w-4" />
Theo dõi
        </Button>
        <Button
          size="sm"
          variant={showGeofences ? 'default' : 'outline'}
          onClick={toggleGeofences}
          className="h-8"
        >
          <Layers2 className="mr-1 h-4 w-4" />
Vùng địa lý
        </Button>
      </div>
    </div>
  );
};
