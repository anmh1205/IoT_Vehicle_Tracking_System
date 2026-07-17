'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPinned, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DeviceDetailModalContainer } from '@/features/devices/components/device-detail-modal/modal-container';
import { deviceServices } from '@/lib/api/devices';
import { VehicleDetailContent } from './vehicle-detail-content';

export const VehicleDetailModal = ({
  open,
  onOpenChange,
  vehicle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicle: any | null;
}) => {
  const [linkedDeviceOpen, setLinkedDeviceOpen] = useState(false);
  const linkedDeviceQuery = useQuery({
    queryKey: ['vehicle-linked-device', vehicle?.deviceId],
    enabled: open && Boolean(vehicle?.deviceId),
    queryFn: async () => {
      const response = await deviceServices.getList({ search: vehicle?.deviceId, limit: 1 });
      return response.items?.[0] ?? null;
    },
  });

  const linkedDevice = linkedDeviceQuery.data ?? null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[95dvh] w-[min(calc(100vw-1rem),1320px)] max-w-none flex-col overflow-hidden p-0 sm:w-[min(calc(100vw-4rem),1320px)] sm:max-w-none">
          <DialogHeader className="shrink-0 border-b px-6 py-5 pr-14">
            <DialogTitle>{vehicle?.plateNumber ?? vehicle?.vehicleId ?? 'Chi tiết phương tiện'}</DialogTitle>
          </DialogHeader>

          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/10 px-6 py-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/operations/map">
                <MapPinned className="mr-2 h-4 w-4" />
                Mở bản đồ vận hành
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!linkedDevice || linkedDeviceQuery.isLoading}
              onClick={() => setLinkedDeviceOpen(true)}
            >
              <Radio className="mr-2 h-4 w-4" />
              {linkedDevice ? `Mở thiết bị ${linkedDevice.deviceId}` : 'Không có thiết bị vận hành'}
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <VehicleDetailContent vehicle={vehicle} />
          </div>
        </DialogContent>
      </Dialog>

      <DeviceDetailModalContainer
        device={linkedDevice}
        open={linkedDeviceOpen}
        onOpenChange={setLinkedDeviceOpen}
      />
    </>
  );
};
