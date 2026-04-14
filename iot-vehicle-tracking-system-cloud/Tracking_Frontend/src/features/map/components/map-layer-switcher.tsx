'use client';
import { Button } from '@/components/ui/button';
import { useMapStore } from '@/features/map/store/map-store';
import type { MapLayer } from '@/features/map/types';
import { cn } from '@/lib/utils';
const LAYERS: Array<{
  value: MapLayer;
  label: string;
}> = [
  { value: 'street', label: 'Đường phố' },
  { value: 'satellite', label: 'Vệ tinh' },
];
export const MapLayerSwitcher = () => {
  const layer = useMapStore((state) => state.mapLayer);
  const setLayer = useMapStore((state) => state.setMapLayer);
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-background/95 p-1 shadow-lg backdrop-blur">
      {LAYERS.map((item) => (
        <Button
          key={item.value}
          size="sm"
          variant={layer === item.value ? 'default' : 'secondary'}
          className={cn(
            'h-8 px-3 text-xs',
            layer !== item.value && 'bg-background/80 text-muted-foreground hover:bg-background',
          )}
          onClick={() => setLayer(item.value)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
};
