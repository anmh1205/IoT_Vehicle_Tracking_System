'use client';

import { useEffect } from 'react';
import { Circle, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import type { MapGeofenceDraft } from './map-geofence-types';

const DraftGeofenceClickHandler = ({
  enabled,
  onPick,
}: {
  enabled: boolean;
  onPick: (latitude: number, longitude: number) => void;
}) => {
  useMapEvents({
    click(event) {
      if (!enabled) {
        return;
      }

      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
};

const DraftGeofenceViewport = ({ draft }: { draft: MapGeofenceDraft | null }) => {
  const map = useMap();

  useEffect(() => {
    if (!draft) {
      return;
    }

    map.panTo([draft.centerLatitude, draft.centerLongitude], { animate: true, duration: 0.4 });
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

  return (
    <>
      <Circle
        center={[draft.centerLatitude, draft.centerLongitude]}
        radius={draft.radiusMeters}
        pathOptions={{ color: draft.color, fillColor: draft.color, fillOpacity: 0.12, weight: 2 }}
      />
      <CircleMarker
        center={[draft.centerLatitude, draft.centerLongitude]}
        radius={8}
        pathOptions={{ color: draft.color, fillColor: draft.color, fillOpacity: 0.95 }}
      />
      <DraftGeofenceViewport draft={draft} />
      <DraftGeofenceClickHandler enabled={draft.isPickingCenter} onPick={onPickCenter} />
    </>
  );
};
