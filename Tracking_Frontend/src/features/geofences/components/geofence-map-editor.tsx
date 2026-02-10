'use client';

import dynamic from 'next/dynamic';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false });

export function GeofenceMapEditor({ lat, lon, radius }: { lat: number; lon: number; radius: number }) {
  return <div className="h-[280px] overflow-hidden rounded border"><MapContainer center={[lat, lon]} zoom={13} className="h-full w-full"><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><Circle center={[lat, lon]} radius={radius} pathOptions={{ color: '#2563eb' }} /></MapContainer></div>;
}
