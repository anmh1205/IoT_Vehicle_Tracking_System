'use client';
import { Calendar } from '@/components/ui/calendar';
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
  onDayChange: (d: Date | undefined) => void;
  rows: any[];
}) => {
  return (
    <div className="space-y-3">
      <Calendar mode="single" selected={day} onSelect={onDayChange} className="rounded-md border" />
      <div className="space-y-2 text-sm">
        {rows
          .filter(
            (r: any) => String(r.scheduledDate).slice(0, 10) === day?.toISOString().slice(0, 10),
          )
          .map((r: any) => (
            <div key={r.id} className="rounded border p-2">
              #{r.id} - {MAINTENANCE_TYPE_LABELS[r.maintenanceType] ?? r.maintenanceType} -{' '}
              {STATUS_LABELS[r.status] ?? r.status}
            </div>
          ))}
      </div>
    </div>
  );
};
