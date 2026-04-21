'use client';

import { useEffect, useRef } from 'react';
import { Circle, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import type { VehicleAllowedZone } from '@/lib/api/geofences';

type AllowedZonePreviewDraft = {
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  isPickingCenter: boolean;
} | null;

type AllowedZoneCircle = {
  center: [number, number];
  radiusMeters: number;
  isPreview: boolean;
};

const ACTIVE_STYLE = {
  color: '#16a34a',
  fillColor: '#16a34a',
  fillOpacity: 0.12,
  weight: 2,
};

const PREVIEW_STYLE = {
  color: '#f59e0b',
  fillColor: '#f59e0b',
  fillOpacity: 0.16,
  weight: 2,
  dashArray: '8 6',
};

const hasMeaningfulCenterChange = (
  previous: [number, number] | null,
  next: [number, number],
) => !previous || Math.abs(previous[0] - next[0]) > 0.0002 || Math.abs(previous[1] - next[1]) > 0.0002;

const toCircle = (
  centerLatitude: number,
  centerLongitude: number,
  radiusMeters: number,
  isPreview: boolean,
): AllowedZoneCircle | null => {
  const center = [Number(centerLatitude), Number(centerLongitude)] as [number, number];
  const radius = Number(radiusMeters);

  if (!Number.isFinite(center[0]) || !Number.isFinite(center[1]) || !Number.isFinite(radius) || radius <= 0) {
    return null;
  }

  return {
    center,
    radiusMeters: radius,
    isPreview,
  };
};

const AllowedZoneViewport = ({ center }: { center: [number, number] | null }) => {
  const map = useMap();
  const previousCenterRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!center || !hasMeaningfulCenterChange(previousCenterRef.current, center)) {
      return;
    }

    previousCenterRef.current = center;
    map.panTo(center, { animate: true, duration: 0.35 });
  }, [center, map]);

  return null;
};

const AllowedZonePickHandler = ({
  enabled,
  onPickCenter,
}: {
  enabled: boolean;
  onPickCenter: (latitude: number, longitude: number) => void;
}) => {
  useMapEvents({
    click(event) {
      if (!enabled) {
        return;
      }

      onPickCenter(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
};

export const MapAllowedZoneLayer = ({
  activeZone,
  preview,
  visible,
  onPickCenter,
}: {
  activeZone: VehicleAllowedZone | null;
  preview: AllowedZonePreviewDraft;
  visible: boolean;
  onPickCenter: (latitude: number, longitude: number) => void;
}) => {
  const previewCircle =
    preview && visible
      ? toCircle(preview.centerLatitude, preview.centerLongitude, preview.radiusMeters, true)
      : null;
  const activeCircle =
    !preview && visible && activeZone
      ? toCircle(activeZone.centerLatitude, activeZone.centerLongitude, activeZone.radiusMeters, false)
      : null;
  const circle = previewCircle ?? activeCircle;

  if (!circle) {
    return <AllowedZonePickHandler enabled={Boolean(preview?.isPickingCenter)} onPickCenter={onPickCenter} />;
  }

  return (
    <>
      <Circle center={circle.center} radius={circle.radiusMeters} pathOptions={circle.isPreview ? PREVIEW_STYLE : ACTIVE_STYLE} />
      <CircleMarker
        center={circle.center}
        radius={7}
        pathOptions={{
          color: circle.isPreview ? PREVIEW_STYLE.color : ACTIVE_STYLE.color,
          fillColor: circle.isPreview ? PREVIEW_STYLE.color : ACTIVE_STYLE.color,
          fillOpacity: 0.95,
          weight: 2,
        }}
      />
      <AllowedZoneViewport center={circle.center} />
      <AllowedZonePickHandler enabled={Boolean(preview?.isPickingCenter)} onPickCenter={onPickCenter} />
    </>
  );
};
