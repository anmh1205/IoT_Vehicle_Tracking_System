'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
          <SheetTitle>{vehicle?.plateNumber ?? 'Chi tiet phuong tien'}</SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <VehicleDetailContent vehicle={vehicle} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

