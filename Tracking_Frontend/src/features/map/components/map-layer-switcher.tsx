'use client';
import { Button } from '@/components/ui/button';
import { useMapStore } from '@/features/map/store/map-store';
import type { MapLayer } from '@/features/map/types';
const LAYERS: Array<{
  value: MapLayer;
  label: string;
}> = [
  { value: 'street', label: 'Street' },
  { value: 'satellite', label: 'Satellite' },
];
export const MapLayerSwitcher = () => {
  const layer = useMapStore((state) => state.mapLayer);
  const setLayer = useMapStore((state) => state.setMapLayer);
  return (
    <div className="rounded-md border bg-background/90 p-1 backdrop-blur">
      {LAYERS.map((item) => (
        <Button
          key={item.value}
          size="sm"
          variant={layer === item.value ? 'default' : 'ghost'}
          className="h-8 px-2 text-xs"
          onClick={() => setLayer(item.value)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
};
