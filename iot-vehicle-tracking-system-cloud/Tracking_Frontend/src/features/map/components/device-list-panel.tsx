'use client';

import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMapStore } from '@/features/map/store/map-store';
import { DeviceFilter } from './device-filter';
import { DeviceListItem } from './device-list-item';
import { DeviceSearch } from './device-search';
import { MapDeviceSummary } from './map-device-summary';
import { buildMapDeviceStats, filterDevices, sortDevices } from './map-panel-utils';

export const DeviceListPanel = () => {
  const positions = useMapStore((state) => state.positions);
  const selectedDeviceId = useMapStore((state) => state.selectedDeviceId);
  const focusDevice = useMapStore((state) => state.focusDevice);
  const searchTerm = useMapStore((state) => state.searchTerm);
  const setSearchTerm = useMapStore((state) => state.setSearchTerm);
  const statusFilter = useMapStore((state) => state.statusFilter);
  const setStatusFilter = useMapStore((state) => state.setStatusFilter);

  const devices = useMemo(() => sortDevices(Array.from(positions.values())), [positions]);
  const filteredDevices = useMemo(
    () => filterDevices(devices, searchTerm, statusFilter),
    [devices, searchTerm, statusFilter],
  );
  const stats = useMemo(
    () => buildMapDeviceStats(filteredDevices, devices.length),
    [devices.length, filteredDevices],
  );

  return (
    <aside
      aria-label="Danh sách thiết bị trên bản đồ"
      className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden border-r bg-background p-3"
    >
      <div className="flex flex-nowrap items-center gap-2">
        <DeviceSearch
          value={searchTerm}
          onChange={setSearchTerm}
          className="min-w-0 flex-1"
          inputClassName="h-9"
        />
        <DeviceFilter value={statusFilter} onChange={setStatusFilter} className="h-9 w-[136px] shrink-0" />
      </div>

      <MapDeviceSummary stats={stats} />

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 pr-2">
          {filteredDevices.map((device) => (
            <DeviceListItem
              key={device.deviceId}
              device={device}
              active={device.deviceId === selectedDeviceId}
              onClick={() => focusDevice(device.deviceId)}
            />
          ))}
          {filteredDevices.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
              Không có thiết bị phù hợp với bộ lọc hiện tại.
            </p>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  );
};
