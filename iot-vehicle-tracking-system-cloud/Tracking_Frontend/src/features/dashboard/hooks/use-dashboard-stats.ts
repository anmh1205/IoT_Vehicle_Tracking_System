import { useQuery } from '@tanstack/react-query';
import { dashboardServices } from '@/lib/api/dashboard';

const STATUS_NAME_LABELS: Record<string, string> = {
  running: 'Đang gửi dữ liệu',
  online: 'Còn heartbeat',
  stopped: 'Chậm nhịp',
  offline: 'Mất kết nối',
  disconnected: 'Mất kết nối',
  error: 'Lỗi telemetry',
  unknown: 'Chưa rõ',
};

export const useDashboardStats = () =>
  useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardServices.getStats,
  });

export const useDashboardActivity = (limit = 20) =>
  useQuery({
    queryKey: ['dashboard', 'activity', limit],
    queryFn: () => dashboardServices.getActivity(limit),
  });

export const useDeviceActivity = (days = 7) =>
  useQuery({
    queryKey: ['dashboard', 'device-activity', days],
    queryFn: () => dashboardServices.getDeviceActivity(days),
  });

export const useDeviceStatusDistribution = () =>
  useQuery({
    queryKey: ['dashboard', 'device-status'],
    queryFn: dashboardServices.getDeviceStatus,
    select: (items) => items.map((item) => ({
      ...item,
      name: STATUS_NAME_LABELS[item.name.toLowerCase()] ?? item.name,
    })),
  });

export const useFleetRuntime = (days = 30) =>
  useQuery({
    queryKey: ['dashboard', 'fleet-runtime', days],
    queryFn: () => dashboardServices.getFleetRuntime(days),
  });
