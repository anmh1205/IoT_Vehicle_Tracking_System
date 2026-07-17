'use client';

import { useEffect, useRef } from 'react';
import { Circle, CircleMarker, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import type { GeoJsonGeometry, VehicleZone } from '@/lib/api/zones';

export type ZonePreviewDraft =
  | {
      zoneType: 'circle';
      centerLatitude: number | null;
      centerLongitude: number | null;
      radiusMeters: number;
      isPickingCenter: boolean;
    }
  | {
      zoneType: 'administrative_boundary';
      geometry: GeoJsonGeometry | null;
      isPickingCenter: false;
    }
  | null;

type ZoneCircle = {
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
  centerLatitude: number | null,
  centerLongitude: number | null,
  radiusMeters: number,
  isPreview: boolean,
): ZoneCircle | null => {
  if (centerLatitude === null || centerLongitude === null) {
    return null;
  }

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

const resolveViewportCenter = (
  activeZone: VehicleZone | null,
  preview: ZonePreviewDraft,
): [number, number] | null => {
  if (preview?.zoneType === 'circle') {
    if (preview.centerLatitude === null || preview.centerLongitude === null) {
      return null;
    }

    return [preview.centerLatitude, preview.centerLongitude];
  }

  if (
    activeZone?.zoneType === 'circle' &&
    activeZone.circleCenterLatitude !== null &&
    activeZone.circleCenterLongitude !== null
  ) {
    return [activeZone.circleCenterLatitude, activeZone.circleCenterLongitude];
  }

  return null;
};

const ZoneViewport = ({ center }: { center: [number, number] | null }) => {
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

const ZonePickHandler = ({
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
  activeZone: VehicleZone | null;
  preview: ZonePreviewDraft;
  visible: boolean;
  onPickCenter: (latitude: number, longitude: number) => void;
}) => {
  const previewCircle =
    preview?.zoneType === 'circle' && visible
      ? toCircle(preview.centerLatitude, preview.centerLongitude, preview.radiusMeters, true)
      : null;
  const activeCircle =
    !preview &&
    visible &&
    activeZone?.zoneType === 'circle' &&
    activeZone.circleCenterLatitude !== null &&
    activeZone.circleCenterLongitude !== null &&
    activeZone.radiusMeters !== null
      ? toCircle(
          activeZone.circleCenterLatitude,
          activeZone.circleCenterLongitude,
          activeZone.radiusMeters,
          false,
        )
      : null;
  const geometry =
    preview?.zoneType === 'administrative_boundary'
      ? preview.geometry
      : !preview && visible && activeZone?.zoneType === 'administrative_boundary'
        ? activeZone.geometry
        : null;
  const circle = previewCircle ?? activeCircle;
  const viewportCenter = resolveViewportCenter(activeZone, preview);
  const isPickingCenter = preview?.zoneType === 'circle' && preview.isPickingCenter;

  return (
    <>
      {circle ? (
        <>
          <Circle
            center={circle.center}
            radius={circle.radiusMeters}
            pathOptions={circle.isPreview ? PREVIEW_STYLE : ACTIVE_STYLE}
          />
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
        </>
      ) : null}

      {geometry ? (
        <GeoJSON
          key={JSON.stringify(geometry)}
          data={geometry as never}
          style={preview?.zoneType === 'administrative_boundary' ? PREVIEW_STYLE : ACTIVE_STYLE}
        />
      ) : null}

      <ZoneViewport center={viewportCenter} />
      <ZonePickHandler enabled={Boolean(isPickingCenter)} onPickCenter={onPickCenter} />
    </>
  );
};
