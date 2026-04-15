'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>{vehicle?.plateNumber ?? vehicle?.vehicleId ?? 'Chi tiết phương tiện'}</SheetTitle>
          <SheetDescription>
            Ngữ cảnh khai thác, pháp lý và liên kết telemetry của phương tiện đang chọn.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          <VehicleDetailContent vehicle={vehicle} compact />
        </div>
      </SheetContent>
    </Sheet>
  );
};
