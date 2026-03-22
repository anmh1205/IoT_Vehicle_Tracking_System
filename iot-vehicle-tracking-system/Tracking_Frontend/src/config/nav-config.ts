import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Car,
  Cpu,
  Download,
  Fuel,
  HardDrive,
  LayoutDashboard,
  Map,
  Play,
  Route,
  Settings,
  Shield,
  UserCheck,
  UserCog,
  Users,
  Wrench,
} from 'lucide-react';

export interface NavItem {
  title: string;
  url: string;
  icon: any;
  items?: NavItem[];
}

export const navConfig: { main: NavItem[]; secondary: NavItem[] } = {
  main: [
    { title: 'Tổng quan', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Bản đồ', url: '/dashboard/map', icon: Map },
    {
      title: 'Quản lý',
      url: '#',
      icon: Cpu,
      items: [
        { title: 'Thiết bị', url: '/dashboard/devices', icon: Cpu },
        { title: 'Phương tiện', url: '/dashboard/vehicles', icon: Car },
        { title: 'Khách hàng', url: '/dashboard/customers', icon: Users },
        { title: 'Tài xế', url: '/dashboard/drivers', icon: UserCheck },
      ],
    },
    {
      title: 'Giám sát',
      url: '#',
      icon: Activity,
      items: [
        { title: 'Cảnh báo', url: '/dashboard/alerts', icon: Bell },
        { title: 'Thông báo', url: '/dashboard/notifications', icon: Bell },
        { title: 'Vi phạm', url: '/dashboard/violations', icon: AlertTriangle },
        { title: 'Chuyến đi', url: '/dashboard/trips', icon: Route },
        { title: 'Vùng giám sát', url: '/dashboard/geofences', icon: Shield },
      ],
    },
    {
      title: 'Kỹ thuật',
      url: '#',
      icon: Wrench,
      items: [
        { title: 'Bảo trì', url: '/dashboard/maintenance', icon: Wrench },
        { title: 'Firmware', url: '/dashboard/firmware', icon: HardDrive },
        { title: 'Xuất dữ liệu', url: '/dashboard/exports', icon: Download },
        { title: 'Trạng thái hệ thống', url: '/dashboard/system-status', icon: Activity },
        { title: 'Mô phỏng', url: '/dashboard/simulator', icon: Play },
      ],
    },
    {
      title: 'Phân tích',
      url: '#',
      icon: BarChart3,
      items: [
        { title: 'Báo cáo', url: '/dashboard/statistics', icon: BarChart3 },
        { title: 'Nhiên liệu', url: '/dashboard/fuel', icon: Fuel },
      ],
    },
  ],
  secondary: [
    { title: 'Cài đặt', url: '/dashboard/settings', icon: Settings },
    { title: 'Quản lý người dùng', url: '/dashboard/users', icon: UserCog },
    { title: 'Quản trị hệ thống', url: '/dashboard/system-admin', icon: Activity },
  ],
};
