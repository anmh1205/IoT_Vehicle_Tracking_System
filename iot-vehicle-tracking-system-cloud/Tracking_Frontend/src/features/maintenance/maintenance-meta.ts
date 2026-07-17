import { addDays } from 'date-fns';

export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang xử lý',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};

export const MAINTENANCE_STATUS_BADGE_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  scheduled: 'outline',
  in_progress: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
};

export const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  oil_change: 'Thay dầu',
  tire_rotation: 'Đảo lốp',
  tire_replacement: 'Thay lốp',
  inspection: 'Kiểm tra định kỳ',
  battery: 'Ắc quy',
  brake: 'Phanh',
  brake_service: 'Bảo dưỡng phanh',
  engine: 'Động cơ',
  coolant: 'Nước làm mát',
  electrical: 'Điện và cảm biến',
  repair: 'Sửa chữa',
  general: 'Bảo trì tổng quát',
};

const KNOWN_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/pickup oil and filter service/gi, 'thay dầu và lọc dầu cho xe pickup'],
  [/bus brake pad replacement/gi, 'thay má phanh xe buýt'],
  [/truck monthly safety inspection/gi, 'kiểm tra an toàn xe tải định kỳ'],
  [/front axle pads near wear limit/gi, 'má phanh cầu trước gần chạm ngưỡng mòn'],
  [/routine service/gi, 'bảo dưỡng định kỳ'],
  [/checklist completed/gi, 'đã hoàn thành checklist'],
  [/mileage crossed warning threshold/gi, 'Số km đã vượt ngưỡng cảnh báo.'],
];

export const MAINTENANCE_TYPE_OPTIONS = Object.entries(MAINTENANCE_TYPE_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const localizeKnownMaintenanceText = (value: string) => {
  let next = value;
  for (const [pattern, replacement] of KNOWN_TEXT_REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  return normalizeWhitespace(next);
};

const stripMockPrefix = (value: string) => value.replace(/^MOCK MTN:\s*/i, '').trim();

export const getMaintenanceTypeLabel = (value: string | null | undefined) =>
  (value ? MAINTENANCE_TYPE_LABELS[value] : null) ?? value ?? 'Khác';

export const inferMaintenanceTypeFromAlert = (alert: any): string => {
  const text = `${String(alert?.title ?? '')} ${String(alert?.message ?? '')}`.toLowerCase();

  if (text.includes('brake')) return 'brake_service';
  if (text.includes('oil')) return 'oil_change';
  if (text.includes('tire')) return 'tire_rotation';
  if (text.includes('coolant')) return 'coolant';
  if (text.includes('battery') || text.includes('voltage')) return 'battery';
  if (text.includes('engine')) return 'engine';
  if (text.includes('channel') || text.includes('sensor') || text.includes('electrical')) {
    return 'electrical';
  }
  if (text.includes('inspection') || text.includes('checklist')) return 'inspection';

  return 'general';
};

const toDatetimeLocalValue = (date: Date) => {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

const toRoundedMetricString = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(Math.round(parsed)) : '';
};

export const formatMaintenanceTitle = (item: {
  title?: string | null;
  maintenanceType?: string | null;
}) => {
  const rawTitle = normalizeWhitespace(String(item?.title ?? ''));
  if (!rawTitle) {
    return getMaintenanceTypeLabel(item?.maintenanceType);
  }

  const localized = localizeKnownMaintenanceText(stripMockPrefix(rawTitle));
  if (/^MOCK MTN:/i.test(rawTitle)) {
    return `Bảo trì mô phỏng: ${localized}`;
  }

  return localized || rawTitle;
};

export const formatMaintenanceDescription = (item: {
  description?: string | null;
  maintenanceType?: string | null;
}) => {
  const rawDescription = normalizeWhitespace(String(item?.description ?? ''));
  if (rawDescription) {
    return localizeKnownMaintenanceText(rawDescription);
  }

  return `Theo dõi và xử lý theo hạng mục ${getMaintenanceTypeLabel(item?.maintenanceType).toLowerCase()}.`;
};

export const createMaintenancePrefillFromAlert = (alert: any) => {
  const maintenanceType = inferMaintenanceTypeFromAlert(alert);
  const label = getMaintenanceTypeLabel(maintenanceType);
  const title = String(alert?.displayTitle ?? alert?.title ?? '').trim();
  const message = String(alert?.displayMessage ?? alert?.message ?? '').trim();
  const sourceNote = alert?.id ? `Nguồn cảnh báo #${alert.id}` : 'Nguồn cảnh báo vận hành';

  return {
    vehicleId: String(alert?.resolvedVehicleId ?? alert?.vehicleId ?? '').trim(),
    maintenanceType,
    title: title || `Xử lý ${label.toLowerCase()}`,
    description: [title, message].filter(Boolean).join(' - '),
    scheduledDate: toDatetimeLocalValue(addDays(new Date(), 1)),
    mileageAtService: toRoundedMetricString(alert?.actualValue),
    nextServiceMileage: toRoundedMetricString(alert?.thresholdValue),
    notes: [sourceNote, message].filter(Boolean).join(' - '),
  };
};
