'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useMap, useMapEvents } from 'react-leaflet';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then((m) => m.CircleMarker), {
  ssr: false,
});

const RecenterMap = ({ lat, lon }: { lat: number; lon: number }) => {
  const map = useMap();

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return;
    }

    map.setView([lat, lon], map.getZoom(), { animate: false });
  }, [lat, lon, map]);

  return null;
};

const PickCenterOnClick = ({
  onCenterChange,
}: {
  onCenterChange?: (latitude: number, longitude: number) => void;
}) => {
  useMapEvents({
    click(event) {
      onCenterChange?.(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
};

export const GeofenceMapEditor = ({
  lat,
  lon,
  radius,
  onCenterChange,
}: {
  lat: number;
  lon: number;
  radius: number;
  onCenterChange?: (latitude: number, longitude: number) => void;
}) => {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="border-b bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        Nhấn trực tiếp lên bản đồ để đổi tâm vùng bán kính.
      </div>
      <div className="h-[320px]">
        <MapContainer center={[lat, lon]} zoom={13} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Circle
            center={[lat, lon]}
            radius={radius}
            pathOptions={{ color: '#2563eb', fillOpacity: 0.12 }}
          />
          <CircleMarker
            center={[lat, lon]}
            radius={8}
            pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.95 }}
          />
          <RecenterMap lat={lat} lon={lon} />
          <PickCenterOnClick onCenterChange={onCenterChange} />
        </MapContainer>
      </div>
    </div>
  );
};
