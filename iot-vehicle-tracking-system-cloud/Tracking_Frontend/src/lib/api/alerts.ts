import { apiClient, unwrap } from './client';

const EXACT_ALERT_TITLE_LABELS: Record<string, string> = {
  'mock alert: brake maintenance due soon': 'Cảnh báo mô phỏng: Sắp đến hạn bảo dưỡng phanh',
  'mock alert: harsh braking detected': 'Cảnh báo mô phỏng: Phát hiện phanh gấp',
  'mock alert: vehicle exited warehouse perimeter': 'Cảnh báo mô phỏng: Xe đã rời chu vi kho',
  'mock alert: speed threshold exceeded': 'Cảnh báo mô phỏng: Vượt ngưỡng tốc độ',
};

const translateDtcStatus = (value: string) =>
  value
    .replace(/stored\/pending/gi, 'đã lưu/chờ xác nhận')
    .replace(/stored\/permanent/gi, 'đã lưu/vĩnh viễn')
    .replace(/stored/gi, 'đã lưu')
    .replace(/pending/gi, 'chờ xác nhận')
    .replace(/permanent/gi, 'vĩnh viễn')
    .replace(/MIL on/gi, 'đèn MIL bật');

const translateInspectionTargets = (value: string) =>
  value
    .replace(/vehicle speed sensor/gi, 'cảm biến tốc độ xe')
    .replace(/ABS ECU signal/gi, 'tín hiệu ECU ABS')
    .replace(/coolant temperature sensor/gi, 'cảm biến nhiệt độ nước làm mát')
    .replace(/connector/gi, 'giắc kết nối')
    .replace(/signal circuit/gi, 'mạch tín hiệu')
    .replace(/MAF sensor/gi, 'cảm biến lưu lượng khí nạp (MAF)')
    .replace(/air filter/gi, 'lọc gió')
    .replace(/intake path/gi, 'đường nạp')
    .replace(/related wiring/gi, 'dây dẫn liên quan')
    .replace(/vacuum leak/gi, 'rò rỉ chân không')
    .replace(/fuel trim/gi, 'hiệu chỉnh nhiên liệu')
    .replace(/oxygen sensor/gi, 'cảm biến oxy')
    .replace(/fuel pressure/gi, 'áp suất nhiên liệu')
    .replace(/injector balance/gi, 'cân bằng kim phun')
    .replace(/brake switch/gi, 'công tắc phanh')
    .replace(/\band\b/gi, 'và');

export const isObdMaintenanceAlert = (item: any): boolean => {
  const signature = `${String(item?.title ?? '')} ${String(item?.message ?? '')}`.toLowerCase();

  return (
    item?.alertType === 'maintenance_due' &&
    (signature.includes('obd') ||
      signature.includes('dtc') ||
      signature.includes('coolant') ||
      signature.includes('voltage') ||
      signature.includes('idle-load') ||
      signature.includes('channel') ||
      signature.includes('brake') ||
      signature.includes('maintenance'))
  );
};

export const localizeAlertTitle = (
  title: string | null | undefined,
  alertType?: string | null,
): string | null => {
  if (!title) return title ?? null;

  const normalized = title.trim().toLowerCase();
  const exactMatch = EXACT_ALERT_TITLE_LABELS[normalized];
  if (exactMatch) {
    return exactMatch;
  }

  const dtcMatch = title.match(/^obd:\s*dtc\s+([a-z]\d{4})$/i);
  if (dtcMatch) {
    return `OBD: Mã lỗi ${dtcMatch[1].toUpperCase()}`;
  }

  if (normalized.includes('idle-load anomaly')) {
    return 'OBD: Bất thường không tải';
  }
  if (normalized.includes('coolant risk pattern')) {
    return 'OBD: Rủi ro nhiệt độ nước làm mát';
  }
  if (normalized.includes('channel unstable')) {
    return 'OBD: Kênh kết nối không ổn định';
  }
  if (normalized.includes('voltage risk under load')) {
    return 'OBD: Rủi ro điện áp khi tải cao';
  }
  if (alertType === 'offline' && normalized.includes('offline')) {
    return 'Cảnh báo mất kết nối thiết bị';
  }

  return title;
};

export const localizeAlertMessage = (
  message: string | null | undefined,
  _alertType?: string | null,
): string | null => {
  if (!message) return message ?? null;

  const trimmed = message.trim();
  const exactLabels: Record<string, string> = {
    'Mileage crossed warning threshold': 'Số km đã vượt ngưỡng cảnh báo.',
    'Short harsh braking event': 'Ghi nhận một sự kiện phanh gấp ngắn.',
    'Vehicle moved outside assigned radius':
      'Phương tiện đã di chuyển ra ngoài bán kính được phân công.',
  };
  if (exactLabels[trimmed]) {
    return exactLabels[trimmed];
  }

  const speedMatch = trimmed.match(/^Speed exceeded by\s+([\d.]+)\s+km\/h\.?$/i);
  if (speedMatch) {
    return `Tốc độ đã vượt ngưỡng thêm ${speedMatch[1]} km/h.`;
  }

  const idleLoadMatch = trimmed.match(
    /^RPM\s+([\d.]+)\s+while speed\s+([\d.]+)\s+km\/h\s+for\s+([\d.]+)\s+minutes\.?$/i,
  );
  if (idleLoadMatch) {
    return `Vòng tua ${idleLoadMatch[1]} khi tốc độ ${idleLoadMatch[2]} km/h trong ${idleLoadMatch[3]} phút.`;
  }

  const coolantMatch = trimmed.match(
    /^Coolant\s+([\d.]+)C\s+with engine load\s+([\d.]+)%\s+sustained at runtime\.?$/i,
  );
  if (coolantMatch) {
    return `Nhiệt độ nước làm mát ${coolantMatch[1]}°C với tải động cơ ${coolantMatch[2]}% trong lúc vận hành.`;
  }

  const channelMatch = trimmed.match(
    /^OBD connect\/init failed\s+([\d.]+)\s+times in the last 5 minutes\.?$/i,
  );
  if (channelMatch) {
    return `Kết nối hoặc khởi tạo OBD thất bại ${channelMatch[1]} lần trong 5 phút gần nhất.`;
  }

  const voltageMatch = trimmed.match(
    /^Battery top\s+([\d.]+)V\s+while engine load\s+([\d.]+)%\.?$/i,
  );
  if (voltageMatch) {
    return `Điện áp ắc quy chính ${voltageMatch[1]}V khi tải động cơ ${voltageMatch[2]}%.`;
  }

  const dtcMatch = trimmed.match(/^([A-Z]\d{4}) \(([^)]+)\)\. Inspect (.+)\.?$/i);
  if (dtcMatch) {
    const code = dtcMatch[1].toUpperCase();
    const status = translateDtcStatus(dtcMatch[2]);
    const targets = translateInspectionTargets(dtcMatch[3]);
    return `${code} (${status}). Kiểm tra ${targets}.`;
  }

  return message;
};

export const localizeAlertForDisplay = <T extends Record<string, any>>(alert: T): T & {
  displayTitle: string | null;
  displayMessage: string | null;
} => ({
  ...alert,
  displayTitle: localizeAlertTitle(alert?.title, alert?.alertType) ?? alert?.title ?? null,
  displayMessage: localizeAlertMessage(alert?.message, alert?.alertType) ?? alert?.message ?? null,
});

export const alertServices = {
  getList: (params?: Record<string, unknown>) =>
    apiClient.get('/alerts', { params }).then((r) => unwrap<any>(r.data)),
  getById: (id: number) => apiClient.get(`/alerts/${id}`).then((r) => unwrap<any>(r.data)),
  create: (data: Record<string, unknown>) =>
    apiClient.post('/alerts', data).then((r) => unwrap<any>(r.data)),
  acknowledge: (id: number) =>
    apiClient.put(`/alerts/${id}/acknowledge`).then((r) => unwrap<any>(r.data)),
  resolve: (id: number, data?: Record<string, unknown>) =>
    apiClient.put(`/alerts/${id}/resolve`, data ?? {}).then((r) => unwrap<any>(r.data)),
  dismiss: (id: number) => apiClient.put(`/alerts/${id}/dismiss`).then((r) => unwrap<any>(r.data)),
  delete: (id: number) => apiClient.delete(`/alerts/${id}`).then((r) => unwrap<any>(r.data)),
};
