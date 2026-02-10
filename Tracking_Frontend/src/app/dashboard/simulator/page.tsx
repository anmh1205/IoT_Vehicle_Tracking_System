'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

export default function SimulatorPage() {
  const [running, setRunning] = useState(false);
  const [deviceId, setDeviceId] = useState('SIM-001');
  const [lat, setLat] = useState(10.762622);
  const [lon, setLon] = useState(106.660172);
  const [speed, setSpeed] = useState(30);
  const [vibration, setVibration] = useState(5);
  const [points, setPoints] = useState<any[]>([]);

  const tick = () => {
    const next = {
      timestamp: new Date().toISOString(),
      deviceId,
      lat: Number((lat + (Math.random() - 0.5) * 0.001).toFixed(6)),
      lon: Number((lon + (Math.random() - 0.5) * 0.001).toFixed(6)),
      speed,
      vibration,
    };
    setLat(next.lat);
    setLon(next.lon);
    setPoints((prev) => [next, ...prev].slice(0, 30));
  };

  return (
    <PageContainer pageTitle="Mô phỏng" pageDescription="Giả lập dữ liệu thiết bị cho demo và test">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Chọn thiết bị</CardTitle></CardHeader>
          <CardContent className="space-y-3"><Input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Cấu hình dữ liệu</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input type="number" value={lat} onChange={(e) => setLat(Number(e.target.value))} />
            <Input type="number" value={lon} onChange={(e) => setLon(Number(e.target.value))} />
            <div><div className="mb-2 text-xs">Tốc độ: {speed} km/h</div><Slider value={[speed]} min={0} max={200} step={1} onValueChange={(v) => setSpeed(v[0] ?? 0)} /></div>
            <div><div className="mb-2 text-xs">Độ rung RMS: {vibration}</div><Slider value={[vibration]} min={0} max={50} step={1} onValueChange={(v) => setVibration(v[0] ?? 0)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Điều khiển</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Button onClick={() => setRunning(true)} disabled={running}>Bắt đầu</Button>
              <Button variant="outline" onClick={() => setRunning(false)} disabled={!running}>Dừng</Button>
              <Button variant="outline" onClick={tick}>Tạo điểm</Button>
            </div>
            <div className="text-xs text-muted-foreground">{running ? 'Đang chạy...' : 'Đã dừng'}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Xem trước dữ liệu</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {points.map((point, index) => (
            <div key={index} className="rounded border p-2">{point.timestamp} - ({point.lat}, {point.lon}) - tốc độ {point.speed} - rung {point.vibration}</div>
          ))}
        </CardContent>
      </Card>
    </PageContainer>
  );
}


