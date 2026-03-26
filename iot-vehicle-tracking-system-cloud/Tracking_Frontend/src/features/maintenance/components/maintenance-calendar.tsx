'use client';

import { Calendar } from '@/components/ui/calendar';
import { formatLocalDateKey } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang xử lý',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};

const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  oil_change: 'Thay dầu',
  tire_rotation: 'Đảo lốp',
  tire_replacement: 'Thay lốp',
  inspection: 'Kiểm tra định kỳ',
  battery: 'Ắc quy',
  brake: 'Phanh',
  engine: 'Động cơ',
};

export const MaintenanceCalendar = ({
  day,
  onDayChange,
  rows,
}: {
  day: Date | undefined;
  onDayChange: (value: Date | undefined) => void;
  rows: any[];
}) => {
  const selectedDayKey = day ? formatLocalDateKey(day) : null;
  const dayRows = rows.filter((row: any) => {
    const scheduledDate = row?.scheduledDate ? new Date(String(row.scheduledDate)) : null;
    if (!scheduledDate || Number.isNaN(scheduledDate.getTime()) || !selectedDayKey) {
      return false;
    }
    return formatLocalDateKey(scheduledDate) === selectedDayKey;
  });

  return (
    <div className="space-y-3">
      <Calendar mode="single" selected={day} onSelect={onDayChange} className="rounded-md border" />
      <div className="space-y-2 text-sm">
        {dayRows.length > 0 ? (
          dayRows.map((row: any) => (
            <div key={row.id} className="rounded border p-2">
              #{row.id} - {MAINTENANCE_TYPE_LABELS[row.maintenanceType] ?? row.maintenanceType} -{' '}
              {STATUS_LABELS[row.status] ?? row.status}
            </div>
          ))
        ) : (
          <p className="rounded border border-dashed px-3 py-4 text-center text-muted-foreground">
            Chưa có lịch bảo trì cho ngày đang chọn.
          </p>
        )}
      </div>
    </div>
  );
};
