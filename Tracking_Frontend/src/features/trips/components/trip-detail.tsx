'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });

export function TripDetail({ points, moving }: { points: any[]; moving?: any }) {
  const polyline = points.map((p: any) => [p.lat, p.lon] as [number, number]);
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle>Lộ trình</CardTitle></CardHeader><CardContent className="h-[420px]"><MapContainer center={polyline[0] ?? [10.762622, 106.660172]} zoom={12} className="h-full w-full"><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{polyline.length > 1 && <Polyline positions={polyline} pathOptions={{ color: '#0ea5e9', weight: 5 }} />}{moving && <Marker position={[moving.lat, moving.lon]} />}</MapContainer></CardContent></Card>
      <Card><CardHeader><CardTitle>Tốc độ theo thời gian</CardTitle></CardHeader><CardContent className="h-[320px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={points.map((p: any) => ({ time: p.timestamp, speed: p.speed }))}><XAxis dataKey="time" hide /><YAxis /><Tooltip /><Area type="monotone" dataKey="speed" stroke="#f97316" fill="#fed7aa" /></AreaChart></ResponsiveContainer></CardContent></Card>
    </div>
  );
}
