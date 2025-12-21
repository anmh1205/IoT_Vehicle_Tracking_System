'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export function DeviceSelector({
  devices,
  selectedDevice,
  onDeviceSelect,
  loading
}: {
  devices: Device.DeviceDto[];
  selectedDevice: string | null;
  onDeviceSelect: (id: string | null) => void;
  loading: boolean;
}) {
  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>Thiết bị</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        {loading ? (
          <Skeleton className='h-10 w-full' />
        ) : (
          <Select value={selectedDevice ?? ''} onValueChange={(v) => onDeviceSelect(v || null)}>
            <SelectTrigger>
              <SelectValue placeholder='Chọn thiết bị' />
            </SelectTrigger>
            <SelectContent>
              {devices.map((d) => (
                <SelectItem key={d.device_id} value={d.device_id}>
                  {d.device_name || d.device_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  );
}

