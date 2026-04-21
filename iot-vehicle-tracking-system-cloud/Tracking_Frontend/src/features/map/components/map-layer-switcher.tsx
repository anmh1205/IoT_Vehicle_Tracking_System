'use client';

import { Map, Satellite } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMapStore } from '@/features/map/store/map-store';
import type { MapLayer } from '@/features/map/types';
import { cn } from '@/lib/utils';

const LAYERS: Array<{
  value: MapLayer;
  label: string;
  icon: typeof Map;
}> = [
  { value: 'street', label: 'Đường phố', icon: Map },
  { value: 'satellite', label: 'Vệ tinh', icon: Satellite },
];

export const MapLayerSwitcher = () => {
  const layer = useMapStore((state) => state.mapLayer);
  const setLayer = useMapStore((state) => state.setMapLayer);

  return (
    <div className="flex items-center gap-1 rounded-2xl border border-border/70 bg-background/95 p-1 shadow-lg backdrop-blur">
      {LAYERS.map((item) => {
        const Icon = item.icon;
        return (
          <Button
            key={item.value}
            size="icon"
            variant={layer === item.value ? 'default' : 'ghost'}
            className={cn(
              'h-8 w-8 rounded-xl',
              layer !== item.value && 'text-muted-foreground hover:bg-background',
            )}
            onClick={() => setLayer(item.value)}
            aria-label={`Chuyển sang bản đồ ${item.label.toLowerCase()}`}
            title={item.label}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </Button>
        );
      })}
    </div>
  );
};
