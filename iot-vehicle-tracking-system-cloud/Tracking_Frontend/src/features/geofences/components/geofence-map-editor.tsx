'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { latLng } from 'leaflet';
import { useMap, useMapEvents } from 'react-leaflet';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then((m) => m.CircleMarker), {
  ssr: false,
});

const formatCoordinate = (value: number) => value.toFixed(6);
const formatRadius = (radiusMeters: number) =>
  radiusMeters >= 1000
    ? `${(radiusMeters / 1000).toLocaleString('vi-VN', {
        maximumFractionDigits: radiusMeters % 1000 === 0 ? 0 : 1,
      })} km`
    : `${radiusMeters.toLocaleString('vi-VN')} m`;

const SyncViewport = ({
  lat,
  lon,
  radius,
}: {
  lat: number;
  lon: number;
  radius: number;
}) => {
  const map = useMap();

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return;
    }

    const safeRadius = Math.max(radius, 200);
    const bounds = latLng(lat, lon).toBounds(safeRadius * 2.4);
    map.fitBounds(bounds, {
      animate: false,
      padding: [28, 28],
      maxZoom: safeRadius <= 1000 ? 15 : safeRadius <= 10000 ? 13 : 11,
    });
  }, [lat, lon, map, radius]);

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
  const isInteractive = typeof onCenterChange === 'function';

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="border-b bg-muted/20 px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Tâm vùng giám sát</p>
            <p className="text-xs text-muted-foreground">
              {isInteractive
                ? 'Chạm lên bản đồ để đổi tâm và hệ thống sẽ tự canh khung theo bán kính.'
                : 'Bản đồ đang hiển thị tâm và vùng tác động hiện tại.'}
            </p>
          </div>
          <div className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
            Bán kính: {formatRadius(Math.max(radius, 0))}
          </div>
        </div>
      </div>

      <div className="h-[340px]">
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
          <SyncViewport lat={lat} lon={lon} radius={radius} />
          <PickCenterOnClick onCenterChange={onCenterChange} />
        </MapContainer>
      </div>

      <div className="grid gap-3 border-t bg-background px-4 py-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Vĩ độ tâm</p>
          <p className="mt-1 font-medium">{formatCoordinate(lat)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Kinh độ tâm</p>
          <p className="mt-1 font-medium">{formatCoordinate(lon)}</p>
        </div>
      </div>
    </div>
  );
};
