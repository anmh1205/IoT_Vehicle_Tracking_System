'use client';

import { useEffect, useState, type ComponentType } from 'react';
import type { MapViewProps } from './map-view';

export default function MapContainer(props: MapViewProps) {
  const [MapComponent, setMapComponent] = useState<ComponentType<MapViewProps> | null>(null);

  useEffect(() => {
    import('./map-view').then((mod) => {
      setMapComponent(() => mod.default);
    });
  }, []);

  if (!MapComponent) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-2 text-zinc-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          <span className="text-sm">Loading map...</span>
        </div>
      </div>
    );
  }

  return <MapComponent {...props} />;
}
