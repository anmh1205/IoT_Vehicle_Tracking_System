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
        placeholder="Search device..."
      />
      <ScrollArea className="h-[220px] rounded-lg border p-2">
        <div className="space-y-2">
          {devices.map((device) => {
            const checked = value.includes(device.deviceId);
            return (
              <label
                key={device.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) => toggle(device.deviceId, Boolean(next))}
                />
                <span className="text-sm">{device.deviceName}</span>
                <span className="text-xs text-muted-foreground">{device.deviceId}</span>
              </label>
            );
          })}
          {devices.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No device found.</p>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
};
