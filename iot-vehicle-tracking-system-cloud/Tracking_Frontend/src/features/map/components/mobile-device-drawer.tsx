'use client';

import { useMemo } from 'react';
import { List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { isMapEditMode } from '@/features/map/lib/map-mode';
import { useMapStore } from '@/features/map/store/map-store';
import { DeviceFilterCompact } from './device-filter-compact';
import { DeviceListItem } from './device-list-item';
import { DeviceSearch } from './device-search';
import { MapDeviceSummary } from './map-device-summary';
import { buildMapDeviceStats, filterDevices, sortDevices } from './map-panel-utils';

export const MobileDeviceDrawer = () => {
  const positions = useMapStore((state) => state.positions);
  const selectedDeviceId = useMapStore((state) => state.selectedDeviceId);
  const searchTerm = useMapStore((state) => state.searchTerm);
  const setSearchTerm = useMapStore((state) => state.setSearchTerm);
  const statusFilter = useMapStore((state) => state.statusFilter);
  const setStatusFilter = useMapStore((state) => state.setStatusFilter);
  const hardMode = useMapStore((state) => state.hardMode);
  const openMobileList = useMapStore((state) => state.openMobileList);
  const closeMobileList = useMapStore((state) => state.closeMobileList);
  const focusDevice = useMapStore((state) => state.focusDevice);
  const open = hardMode === 'mobile-list';
  const showTrigger = !isMapEditMode(hardMode);

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
    <>
      {showTrigger ? (
        <Button
          size="sm"
          variant="secondary"
          className="absolute left-3 top-[max(0.75rem,var(--safe-area-top))] z-[var(--layer-map-surface)] h-11 rounded-full px-4 shadow-lg md:hidden"
          onClick={openMobileList}
        >
          <List className="mr-2 h-4 w-4" aria-hidden="true" />
          Thiết bị ({filteredDevices.length})
        </Button>
      ) : null}

      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            openMobileList();
            return;
          }

          closeMobileList();
        }}
      >
        <SheetContent
          side="bottom"
          className="flex h-[min(76dvh,44rem)] flex-col rounded-t-3xl px-4 md:hidden"
        >
          <SheetHeader className="px-0 pb-2">
            <SheetTitle>Thiết bị trên bản đồ</SheetTitle>
            <SheetDescription className="sr-only">
              Tìm, lọc và chọn thiết bị để chuyển sang thẻ xem nhanh trên bản đồ.
            </SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <DeviceSearch value={searchTerm} onChange={setSearchTerm} />
              </div>
              <DeviceFilterCompact value={statusFilter} onChange={setStatusFilter} />
            </div>

            <MapDeviceSummary stats={stats} />

            <ScrollArea className="min-h-[12rem] flex-1 overflow-hidden">
              <div className="space-y-2 pr-2">
                {filteredDevices.map((device) => (
                  <DeviceListItem
                    key={device.deviceId}
                    device={device}
                    active={selectedDeviceId === device.deviceId}
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
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
