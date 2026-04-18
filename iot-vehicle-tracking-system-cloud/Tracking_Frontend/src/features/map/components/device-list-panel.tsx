'use client';

import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMapStore } from '@/features/map/store/map-store';
import { DeviceFilter } from './device-filter';
import { DeviceListItem } from './device-list-item';
import { DeviceSearch } from './device-search';
import { MapDeviceSummary } from './map-device-summary';
import { buildMapDeviceStats, filterDevices, sortDevices } from './map-panel-utils';
import { SelectedDeviceCard } from './selected-device-card';

export const DeviceListPanel = () => {
  const positions = useMapStore((state) => state.positions);
  const selectedDeviceId = useMapStore((state) => state.selectedDeviceId);
  const toggleSelectedDevice = useMapStore((state) => state.toggleSelectedDevice);
  const searchTerm = useMapStore((state) => state.searchTerm);
  const setSearchTerm = useMapStore((state) => state.setSearchTerm);
  const statusFilter = useMapStore((state) => state.statusFilter);
  const setStatusFilter = useMapStore((state) => state.setStatusFilter);

  const devices = useMemo(() => sortDevices(Array.from(positions.values())), [positions]);
  const filteredDevices = useMemo(
    () => filterDevices(devices, searchTerm, statusFilter),
    [devices, searchTerm, statusFilter],
  );
  const selectedDevice = selectedDeviceId ? (positions.get(selectedDeviceId) ?? null) : null;
  const stats = useMemo(
    () => buildMapDeviceStats(filteredDevices, devices.length),
    [devices.length, filteredDevices],
  );

  return (
    <aside className="flex h-full min-h-0 w-[340px] flex-col gap-3 border-r bg-background p-3">
      <DeviceSearch value={searchTerm} onChange={setSearchTerm} />
      <DeviceFilter value={statusFilter} onChange={setStatusFilter} />
      <MapDeviceSummary stats={stats} />

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 pr-2">
          {filteredDevices.map((device) => (
            <DeviceListItem
              key={device.deviceId}
              device={device}
              active={device.deviceId === selectedDeviceId}
              onClick={() => toggleSelectedDevice(device.deviceId)}
            />
          ))}
          {filteredDevices.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
              Không có thiết bị phù hợp với bộ lọc hiện tại.
            </p>
          ) : null}
        </div>
      </ScrollArea>

      <SelectedDeviceCard device={selectedDevice} />
    </aside>
  );
};
