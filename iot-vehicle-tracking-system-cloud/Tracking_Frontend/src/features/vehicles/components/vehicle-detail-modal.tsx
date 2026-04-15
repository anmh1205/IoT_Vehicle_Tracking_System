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
          <SheetTitle>{vehicle?.plateNumber ?? 'Chi tiet phuong tien'}</SheetTitle>
          <SheetDescription>
            Xem thong tin nhan dien, lien ket telemetry va boi canh van hanh theo tung phuong tien.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          <VehicleDetailContent vehicle={vehicle} />
        </div>
      </SheetContent>
    </Sheet>
  );
};
