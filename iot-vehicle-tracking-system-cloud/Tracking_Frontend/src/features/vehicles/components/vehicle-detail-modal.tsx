'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const VEHICLE_STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động',
  inactive: 'Ngưng hoạt động',
  maintenance: 'Đang bảo trì',
  retired: 'Ngưng khai thác',
};

const Row = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className="rounded-lg border bg-muted/20 p-3">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-medium">{value || '--'}</p>
  </div>
);

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
      <SheetContent className="overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{vehicle?.plateNumber ?? 'Chi tiết phương tiện'}</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="overview" className="mt-4 space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="assignment">Gán thiết bị</TabsTrigger>
            <TabsTrigger value="operations">Vận hành</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="grid gap-3 sm:grid-cols-2">
            <Row label="Mã xe" value={vehicle?.vehicleId} />
            <Row label="Biển số" value={vehicle?.plateNumber} />
            <Row label="Hãng xe" value={vehicle?.brand} />
            <Row label="Dòng xe" value={vehicle?.model} />
            <Row label="Năm sản xuất" value={vehicle?.year ? String(vehicle.year) : '--'} />
            <Row label="Trạng thái" value={VEHICLE_STATUS_LABELS[vehicle?.status] ?? vehicle?.status ?? '--'} />
          </TabsContent>

          <TabsContent value="assignment" className="grid gap-3 sm:grid-cols-2">
            <Row label="Khách hàng" value={vehicle?.customerId ? String(vehicle.customerId) : 'Chưa gán khách hàng'} />
            <Row label="Thiết bị gắn" value={vehicle?.deviceId ? String(vehicle.deviceId) : 'Chưa gán thiết bị'} />
            <Row label="Phiên bản firmware" value={vehicle?.firmwareVersion ?? 'Chưa có dữ liệu'} />
            <Row label="Lưu ý thao tác" value="Dùng hành động Gán thiết bị ở danh sách xe để thay đổi thiết bị đang liên kết." />
          </TabsContent>

          <TabsContent value="operations" className="grid gap-3 sm:grid-cols-2">
            <Row label="Nhiên liệu" value={vehicle?.fuelType ?? 'Chưa xác định'} />
            <Row label="Số ghế" value={vehicle?.seats ? String(vehicle.seats) : '--'} />
            <Row label="Số đăng kiểm" value={vehicle?.registrationNumber ?? '--'} />
            <Row label="Ghi chú" value={vehicle?.notes ?? 'Chưa có ghi chú vận hành'} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
