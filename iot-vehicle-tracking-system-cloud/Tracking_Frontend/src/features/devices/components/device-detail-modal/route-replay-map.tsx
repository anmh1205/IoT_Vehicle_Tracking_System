'use client';

import { useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { DEFAULT_MAP_VIEWPORT, MAP_LAYER_CONFIG } from '@/features/map/constants/map-config';
import { useMapStore } from '@/features/map/store/map-store';
import type { RouteReplayPoint } from './telemetry-insights';

const MapContainer = dynamic(() => import('react-leaflet').then((module) => module.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((module) => module.TileLayer), {
  ssr: false,
});
const Polyline = dynamic(() => import('react-leaflet').then((module) => module.Polyline), {
  ssr: false,
});
const CircleMarker = dynamic(() => import('react-leaflet').then((module) => module.CircleMarker), {
  ssr: false,
});

const RouteReplayViewport = ({
  pathPoints,
  currentPoint,
}: {
  pathPoints: [number, number][];
  currentPoint: RouteReplayPoint | null;
}) => {
  const map = useMap();

  const syncViewport = useCallback(() => {
    if (pathPoints.length >= 2) {
      const bounds = L.latLngBounds(pathPoints);
      map.fitBounds(bounds.pad(0.18), { animate: false });
      return true;
    }

    if (currentPoint) {
      map.setView([currentPoint.latitude, currentPoint.longitude], 15, { animate: false });
      return true;
    }

    return false;
  }, [currentPoint, map, pathPoints]);

  useEffect(() => {
    const refreshMap = () => {
      map.invalidateSize({ pan: false, animate: false });
      syncViewport();
    };

    refreshMap();

    const immediateTimer = window.setTimeout(refreshMap, 60);
    const settleTimer = window.setTimeout(refreshMap, 320);

    return () => {
      window.clearTimeout(immediateTimer);
      window.clearTimeout(settleTimer);
    };
  }, [map, syncViewport]);

  useEffect(() => {
    if (!currentPoint) {
      return;
    }

    map.panTo([currentPoint.latitude, currentPoint.longitude], { animate: true, duration: 0.4 });
  }, [currentPoint, map]);

  return null;
};

export const RouteReplayMap = ({
  pathPoints,
  currentPoint,
  livePoint,
}: {
  pathPoints: [number, number][];
  currentPoint: RouteReplayPoint | null;
  livePoint: [number, number] | null;
}) => {
  const mapLayer = useMapStore((state) => state.mapLayer);
  const startPoint = pathPoints[0] ?? null;
  const endPoint = pathPoints.at(-1) ?? null;
  const center = currentPoint
    ? ([currentPoint.latitude, currentPoint.longitude] as [number, number])
    : livePoint ?? pathPoints[0] ?? DEFAULT_MAP_VIEWPORT.center;
  const layer = MAP_LAYER_CONFIG[mapLayer];

  return (
    <MapContainer center={center} zoom={13} className="h-full w-full" preferCanvas>
      <TileLayer url={layer.url} attribution={layer.attribution} />
      {pathPoints.length > 1 ? (
        <Polyline positions={pathPoints} pathOptions={{ color: '#0ea5e9', weight: 5 }} />
      ) : null}
      {startPoint ? (
        <CircleMarker
          center={startPoint}
          radius={6}
          pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.85 }}
        />
      ) : null}
      {endPoint ? (
        <CircleMarker
          center={endPoint}
          radius={7}
          pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9 }}
        />
      ) : null}
      {livePoint ? (
        <CircleMarker
          center={livePoint}
          radius={8}
          pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.85 }}
        />
      ) : null}
      {currentPoint ? (
        <CircleMarker
          center={[currentPoint.latitude, currentPoint.longitude]}
          radius={9}
          pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.95 }}
        />
      ) : null}
      <RouteReplayViewport pathPoints={pathPoints} currentPoint={currentPoint} />
    </MapContainer>
  );
};
