'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });

export const TripDetail = ({ points, moving }: { points: any[]; moving?: any }) => {
  const polyline = points.map((point: any) => [point.lat, point.lon] as [number, number]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Lộ trình</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[320px] p-0 sm:min-h-[420px]">
          {polyline.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                title="Chưa có dữ liệu hành trình"
                description="Chuyến đi này chưa ghi nhận đủ điểm GPS để hiển thị bản đồ."
              />
            </div>
          ) : (
            <MapContainer
              center={moving ? [moving.lat, moving.lon] : polyline[0] ?? [10.762622, 106.660172]}
              zoom={12}
              className="h-full w-full"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {polyline.length > 1 ? (
                <Polyline positions={polyline} pathOptions={{ color: '#0ea5e9', weight: 5 }} />
              ) : null}
              {moving ? <Marker position={[moving.lat, moving.lon]} /> : null}
            </MapContainer>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Tốc độ theo thời gian</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            {points.length === 0 ? (
              <EmptyState
                title="Chưa có dữ liệu tốc độ"
                description="Bản ghi telemetry sẽ xuất hiện ở đây khi chuyến đi có dữ liệu GPS."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={points.map((point: any) => ({
                    time: new Date(point.timestamp).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                    speed: point.speed,
                  }))}
                >
                  <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} width={36} />
                  <Tooltip />
                  <Area type="monotone" dataKey="speed" stroke="#f97316" fill="#fed7aa" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Điểm hiện tại trong replay</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Thời điểm</p>
              <p className="font-medium">
                {moving?.timestamp ? new Date(moving.timestamp).toLocaleString('vi-VN') : '--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tốc độ</p>
              <p className="font-medium">{moving?.speed ?? 0} km/h</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vĩ độ</p>
              <p className="font-medium">{moving?.lat ?? '--'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kinh độ</p>
              <p className="font-medium">{moving?.lon ?? '--'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
