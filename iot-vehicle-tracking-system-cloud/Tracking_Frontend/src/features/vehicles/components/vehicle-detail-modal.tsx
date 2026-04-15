'use client';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
      <SheetContent className="w-[min(96vw,72rem)] max-w-none overflow-y-auto pr-5">
        <SheetHeader>
          <SheetTitle>{vehicle?.plateNumber ?? 'Chi tiết phương tiện'}</SheetTitle>
          <SheetDescription>
            Xem thông tin nhận diện, liên kết telemetry và bối cảnh vận hành theo từng phương tiện.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          <VehicleDetailContent vehicle={vehicle} />
        </div>
      </SheetContent>
    </Sheet>
  );
};
