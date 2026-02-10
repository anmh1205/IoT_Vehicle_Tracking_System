'use client';

import { useMapStore } from '@/lib/stores/map-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const STATUS_LABELS: Record<string, string> = {
  running: 'Đang chạy',
  stopped: 'Dừng',
  disconnected: 'Mất kết nối',
};

export function MapSidebar() {
  const [search, setSearch] = useState('');
  const positions = useMapStore((s) => s.positions);
  const selectDevice = useMapStore((s) => s.selectDevice);
  const selectedDeviceId = useMapStore((s) => s.selectedDeviceId);

  const rows = useMemo(() => Array.from(positions.values()).filter((item) => item.deviceName.toLowerCase().includes(search.toLowerCase())), [positions, search]);
  const selected = selectedDeviceId ? positions.get(selectedDeviceId) : null;

  return (
    <div className="hidden w-80 border-r bg-background md:block">
      <Tabs defaultValue="devices" className="h-full">
        <div className="p-3">
          <TabsList className="w-full">
            <TabsTrigger value="devices" className="flex-1">Phương tiện</TabsTrigger>
            <TabsTrigger value="geofences" className="flex-1">Vùng giám sát</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="devices" className="m-0 h-[calc(100%-56px)] p-3">
          <Input placeholder="Tìm theo tên" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="mt-3 space-y-2 overflow-y-auto">
            {rows.map((item) => (
              <button key={item.deviceId} className="w-full rounded border p-2 text-left text-sm hover:bg-muted" onClick={() => selectDevice(item.deviceId)}>
                <div className="font-medium">{item.deviceName}</div>
                <div className="text-xs text-muted-foreground">{STATUS_LABELS[item.status] ?? item.status} - {item.speed} km/h</div>
              </button>
            ))}
          </div>

          {selected && (
            <Card className="mt-3">
              <CardHeader><CardTitle className="text-sm">Thiết bị đã chọn</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-xs">
                <div>{selected.deviceName}</div>
                <div>Trạng thái: {STATUS_LABELS[selected.status] ?? selected.status}</div>
                <div>Tốc độ: {selected.speed} km/h</div>
                <div>Vĩ độ/Kinh độ: {selected.lat}, {selected.lon}</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="geofences" className="m-0 p-3 text-sm text-muted-foreground">Danh sách vùng giám sát được quản lý tại trang Vùng giám sát.</TabsContent>
      </Tabs>
    </div>
  );
}

