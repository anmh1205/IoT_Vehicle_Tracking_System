import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BellRing,
  CarFront,
  ChartColumnIncreasing,
  Fuel,
  MapPinned,
  ShieldCheck,
  Smartphone,
  Upload,
  Wifi,
  Wrench,
  Waypoints,
} from 'lucide-react';

export interface MarketingFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  routeLabel: string;
}

export interface SurfaceGroup {
  title: string;
  description: string;
  items: string[];
}

export interface FlowStep {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface LoginLandingHighlight {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface LoginLandingContent {
  badge: string;
  title: string;
  description: string;
  highlights: LoginLandingHighlight[];
  proofLabels: string[];
  assistText: string;
}

export const heroSignals = [
  'Bản đồ realtime cho đội xe và thiết bị',
  'Cảnh báo, geofence, trips trong cùng một bề mặt',
  'Web dashboard, mobile shell và system status đi chung',
];

export const featureCards: MarketingFeature[] = [
  {
    icon: MapPinned,
    title: 'Theo dõi xe theo thời gian thực',
    description: 'Giữ vị trí, tuyến đường và trạng thái đội xe trong một màn hình vận hành tập trung.',
    routeLabel: '/dashboard/map',
  },
  {
    icon: BellRing,
    title: 'Cảnh báo tức thời',
    description: 'Theo dõi cảnh báo, thông báo và sự kiện quan trọng để phản ứng nhanh hơn.',
    routeLabel: '/dashboard/alerts',
  },
  {
    icon: ShieldCheck,
    title: 'Giám sát geofence và chuyến đi',
    description: 'Kết nối vùng giám sát, lộ trình và hành trình để nhìn rõ toàn bộ bối cảnh vận hành.',
    routeLabel: '/dashboard/geofences + /dashboard/trips',
  },
  {
    icon: Fuel,
    title: 'Nhiên liệu và hiệu suất đội xe',
    description: 'Xem dữ liệu nhiên liệu và báo cáo để đánh giá chi phí khai thác theo ca vận hành.',
    routeLabel: '/dashboard/fuel + /dashboard/statistics',
  },
  {
    icon: Wrench,
    title: 'Bảo trì và sức khỏe hệ thống',
    description: 'Quản lý bảo trì, firmware và tình trạng hạ tầng mà không phải đổi ngữ cảnh.',
    routeLabel: '/dashboard/maintenance + /dashboard/system-status',
  },
  {
    icon: Upload,
    title: 'Xuất dữ liệu cho vận hành',
    description: 'Đẩy dữ liệu ra ngoài khi cần tổng hợp, đối soát hoặc chia sẻ giữa các bộ phận.',
    routeLabel: '/dashboard/exports',
  },
];

export const surfaceGroups: SurfaceGroup[] = [
  {
    title: 'Điều hành',
    description: 'Tập trung map, overview, alerts và notifications.',
    items: ['Tổng quan', 'Bản đồ', 'Cảnh báo', 'Thông báo'],
  },
  {
    title: 'Quản lý đội xe',
    description: 'Giữ data xe, thiết bị, tài xế, khách hàng và trips liền mạch.',
    items: ['Thiết bị', 'Phương tiện', 'Tài xế', 'Khách hàng', 'Chuyến đi'],
  },
  {
    title: 'Kỹ thuật',
    description: 'Theo dõi bảo trì, firmware, system status và dữ liệu xuất bản.',
    items: ['Bảo trì', 'Firmware', 'Nhiên liệu', 'Trạng thái hệ thống', 'Xuất dữ liệu'],
  },
];

export const flowSteps: FlowStep[] = [
  {
    icon: CarFront,
    title: 'Thiết bị trên xe',
    description: 'GPS, GNSS, LTE và cảm biến gửi dữ liệu từ hiện trường.',
  },
  {
    icon: Wifi,
    title: 'MQTT và hạ tầng message',
    description: 'Bridge và broker tiếp nhận telemetry để không đứt mạch giám sát.',
  },
  {
    icon: Activity,
    title: 'Backend và rule xử lý',
    description: 'Chuẩn hóa dữ liệu, phát cảnh báo và duy trì phiên vận hành.',
  },
  {
    icon: Smartphone,
    title: 'Dashboard và mobile shell',
    description: 'Đưa cùng một hệ thống lên web điều hành và bề mặt theo dõi di động.',
  },
  {
    icon: ChartColumnIncreasing,
    title: 'Observability và báo cáo',
    description: 'System status, metrics và exports giúp nhìn thấy sức khỏe toàn hệ thống.',
  },
];

export const loginLandingContent: LoginLandingContent = {
  badge: 'Trung tâm điều hành đội xe',
  title: 'Theo dõi đội xe theo thời gian thực, xử lý sự cố ngay khi phát sinh.',
  description:
    'Từ vị trí xe, trạng thái thiết bị đến cảnh báo bất thường, mọi tín hiệu được đưa về cùng một màn hình để ca trực phối hợp nhanh và chính xác.',
  highlights: [
    {
      icon: Activity,
      title: 'Nắm tình hình ngay khi đăng nhập',
      description: 'Bản đồ, trạng thái kết nối và cảnh báo được cập nhật liên tục để bạn biết xe nào cần ưu tiên trước.',
    },
    {
      icon: Waypoints,
      title: 'Điều phối liền mạch trong một luồng',
      description: 'Dữ liệu đi từ thiết bị qua backend lên dashboard theo cùng ngữ cảnh, giúp thao tác ít hơn và quyết định nhanh hơn.',
    },
    {
      icon: ShieldCheck,
      title: 'Truy cập đúng quyền, vận hành ổn định',
      description: 'Xác thực theo vai trò và quản lý phiên tập trung giúp mỗi bộ phận vào đúng phạm vi cần xử lý.',
    },
  ],
  proofLabels: ['Bản đồ GPS realtime', 'Cảnh báo geofence', 'Theo dõi chuyến đi', 'Trạng thái hệ thống', 'Quản lý quyền truy cập'],
  assistText: 'Đăng nhập để tiếp tục theo dõi và điều phối đội xe trong ca hiện tại.',
};
