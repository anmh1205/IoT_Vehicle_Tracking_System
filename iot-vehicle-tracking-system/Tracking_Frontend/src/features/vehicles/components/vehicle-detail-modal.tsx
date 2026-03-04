'use client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
const VEHICLE_STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động',
  inactive: 'Ngưng hoạt động',
  maintenance: 'Đang bảo trì',
};
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
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{vehicle?.plateNumber ?? 'Chi tiết phương tiện'}</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="trips">Chuyến đi gần đây</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="space-y-2 text-sm">
            <div>Mã xe: {vehicle?.vehicleId ?? '-'}</div>
            <div>Biển số: {vehicle?.plateNumber ?? '-'}</div>
            <div>Hãng xe: {vehicle?.brand ?? '-'}</div>
            <div>Dòng xe: {vehicle?.model ?? '-'}</div>
            <div>
              Trạng thái: {VEHICLE_STATUS_LABELS[vehicle?.status] ?? vehicle?.status ?? '-'}
            </div>
          </TabsContent>
          <TabsContent value="trips" className="space-y-2 text-sm">
            <div>Phần này hiển thị chuyến đi gần đây của xe đã chọn.</div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
