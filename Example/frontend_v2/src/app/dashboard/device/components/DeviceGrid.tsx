'use client';

import { Card } from '@/components/ui/card';
import { CardGridSkeleton } from './DeviceSkeletons';
import { DeviceCard } from './DeviceCard';
import { DEVICE_SPACING, DEVICE_RADIUS, DEVICE_GLASS, DEVICE_SHADOWS } from './device-design-constants';
import { Inbox } from 'lucide-react';

export function DeviceGrid({
  devices,
  loading,
  onView,
  onEdit,
  onDelete,
  emptyMessage
}: {
  devices: Device.DeviceDto[];
  loading: boolean;
  onView: (device: Device.DeviceDto) => void;
  onEdit: (device: Device.DeviceDto) => void;
  onDelete: (device: Device.DeviceDto) => void;
  emptyMessage?: string;
}) {
  if (loading) return <CardGridSkeleton />;

  if (!devices.length) {
    return (
      <Card
        className={`${DEVICE_RADIUS.card} bg-card border border-border ${DEVICE_SHADOWS.md} py-16 px-6 text-center`}
      >
        <div className='flex flex-col items-center justify-center space-y-4'>
          <div className='rounded-full bg-muted/50 dark:bg-muted/40 p-4'>
            <Inbox className='h-8 w-8 text-muted-foreground' />
          </div>
          <div>
            <p className='text-base font-medium text-foreground'>
        {emptyMessage || 'Không có thiết bị phù hợp.'}
            </p>
            <p className='mt-2 text-sm text-muted-foreground'>
              Thử thay đổi bộ lọc hoặc tìm kiếm để xem thêm kết quả.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={`grid ${DEVICE_SPACING.gap.md} sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4`}>
      {devices.map((device) => (
        <DeviceCard
          key={device.device_id}
          device={device}
          onView={() => onView(device)}
          onEdit={() => onEdit(device)}
          onDelete={() => onDelete(device)}
        />
      ))}
    </div>
  );
}

