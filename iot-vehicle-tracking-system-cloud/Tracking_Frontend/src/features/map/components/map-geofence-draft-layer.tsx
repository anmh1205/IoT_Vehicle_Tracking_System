'use client';

import { useEffect, useRef } from 'react';
import { Circle, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import type { MapGeofenceDraft } from './map-geofence-types';

const DraftGeofenceClickHandler = ({
  enabled,
  onPick,
}: {
  enabled: boolean;
  onPick: (latitude: number, longitude: number) => void;
}) => {
  const pickCenter = (latitude: number, longitude: number) => {
    if (!enabled) {
      return;
    }

    onPick(latitude, longitude);
  };

  useMapEvents({
    click(event) {
      pickCenter(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
};

const DraftGeofenceViewport = ({ draft }: { draft: MapGeofenceDraft | null }) => {
  const map = useMap();
  const previousCenterRef = useRef<string | null>(null);

  useEffect(() => {
    if (!draft) {
      previousCenterRef.current = null;
      return;
    }

    const { centerLatitude, centerLongitude } = draft;
    const centerKey = `${centerLatitude.toFixed(6)},${centerLongitude.toFixed(6)}`;
    if (previousCenterRef.current === centerKey) {
      return;
    }

    previousCenterRef.current = centerKey;
    map.panTo([centerLatitude, centerLongitude], { animate: true, duration: 0.4 });
  }, [draft, map]);

  return null;
};

export const MapGeofenceDraftLayer = ({
  draft,
  onPickCenter,
}: {
  draft: MapGeofenceDraft | null;
  onPickCenter: (latitude: number, longitude: number) => void;
}) => {
  if (!draft) {
    return null;
  }

  const center: [number, number] = [draft.centerLatitude, draft.centerLongitude];
  const markerRadius = draft.isPickingCenter ? 10 : 8;

  return (
    <>
      <Circle
        center={center}
        radius={draft.radiusMeters}
        pathOptions={{
          color: draft.color,
          fillColor: draft.color,
          fillOpacity: draft.isPickingCenter ? 0.16 : 0.12,
          weight: draft.isPickingCenter ? 3 : 2,
          dashArray: draft.isPickingCenter ? '8 6' : undefined,
        }}
      />
      <CircleMarker
        center={center}
        radius={markerRadius}
        pathOptions={{ color: draft.color, fillColor: draft.color, fillOpacity: 0.95, weight: 2 }}
      />
      {draft.isPickingCenter ? (
        <CircleMarker
          center={center}
          radius={16}
          interactive={false}
          pathOptions={{ color: draft.color, fillOpacity: 0, opacity: 0.45, weight: 1.5, dashArray: '4 4' }}
        />
      ) : null}
      <DraftGeofenceViewport draft={draft} />
      <DraftGeofenceClickHandler enabled={draft.isPickingCenter} onPick={onPickCenter} />
    </>
  );
};
