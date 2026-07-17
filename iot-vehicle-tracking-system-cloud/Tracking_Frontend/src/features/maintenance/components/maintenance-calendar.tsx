'use client';

import { Calendar } from '@/components/ui/calendar';
import {
  MAINTENANCE_STATUS_LABELS,
  getMaintenanceTypeLabel,
} from '@/features/maintenance/maintenance-meta';
import { formatLocalDateKey } from '@/lib/utils';

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
              #{row.id} - {getMaintenanceTypeLabel(row.maintenanceType)} -{' '}
              {MAINTENANCE_STATUS_LABELS[row.status] ?? row.status}
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
