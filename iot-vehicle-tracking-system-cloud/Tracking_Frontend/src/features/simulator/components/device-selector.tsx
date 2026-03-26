'use client';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDevices } from '@/features/devices/hooks/use-devices';
export const DeviceSelector = ({
  value,
  onChange,
}: {
  value: string[];
  onChange: (deviceIds: string[]) => void;
}) => {
  const [search, setSearch] = useState('');
  const devicesQuery = useDevices({ limit: 200 });
  const devices = useMemo(() => {
    const rows = devicesQuery.data?.items ?? [];
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return rows;
    }
    return rows.filter(
      (item) =>
        item.deviceId.toLowerCase().includes(keyword) ||
        item.deviceName.toLowerCase().includes(keyword),
    );
  }, [devicesQuery.data?.items, search]);
  const toggle = (deviceId: string, checked: boolean) => {
    if (checked) {
      onChange(Array.from(new Set([...value, deviceId])));
      return;
    }
    onChange(value.filter((item) => item !== deviceId));
  };
  return (
    <div className="space-y-2">
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Tìm thiết bị..."
      />
      <ScrollArea className="h-[220px] rounded-lg border p-2">
        <div className="space-y-2">
          {devices.map((device) => {
            const checked = value.includes(device.deviceId);
            const checkboxId = `sim-device-${device.id}`;
            return (
              <div key={device.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted">
                <Checkbox
                  id={checkboxId}
                  checked={checked}
                  onCheckedChange={(next) => toggle(device.deviceId, Boolean(next))}
                  aria-label={`Chọn thiết bị ${device.deviceName}`}
                />
                <label htmlFor={checkboxId} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                  <span className="truncate text-sm">{device.deviceName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{device.deviceId}</span>
                </label>
              </div>
            );
          })}
          {devices.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Không tìm thấy thiết bị.</p>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
};
