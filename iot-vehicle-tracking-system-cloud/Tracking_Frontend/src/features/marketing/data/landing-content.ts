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
  'Cảnh báo, vùng, trips trong cùng một bề mặt',
  'Web dashboard, mobile shell và system status đi chung',
];

export const featureCards: MarketingFeature[] = [
  {
    icon: MapPinned,
    title: 'Theo dõi xe theo thời gian thực',
    description: 'Giữ vị trí, tuyến đường và trạng thái đội xe trong một màn hình vận hành tập trung.',
    routeLabel: '/dashboard/operations/map',
  },
  {
    icon: BellRing,
    title: 'Cảnh báo tức thời',
    description: 'Theo dõi cảnh báo, thông báo và sự kiện quan trọng để phản ứng nhanh hơn.',
    routeLabel: '/dashboard/attention/queue',
  },
  {
    icon: ShieldCheck,
    title: 'Giám sát vùng và chuyến đi',
    description: 'Kết nối vùng, lộ trình và hành trình để nhìn rõ toàn bộ bối cảnh vận hành.',
    routeLabel: '/dashboard/zones + /dashboard/operations/trips',
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
    description: 'Quản lý bảo trì, firmware và tình trạng hạ tầng mà không phải đổi màn hình.',
    routeLabel: '/dashboard/attention/maintenance + /dashboard/platform/system-status',
  },
  {
    icon: Upload,
    title: 'Xuất dữ liệu cho vận hành',
    description: 'Đẩy dữ liệu ra ngoài khi cần tổng hợp, đối soát hoặc chia sẻ giữa các bộ phận.',
    routeLabel: '/dashboard/platform/exports',
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
    title: 'MQTT và hạ tầng thông điệp',
    description: 'Bridge và broker tiếp nhận telemetry để không đứt mạch giám sát.',
  },
  {
    icon: Activity,
    title: 'Backend và quy tắc xử lý',
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
  badge: 'Điều hành đội xe',
  title: 'Đăng nhập để giám sát đội xe và xử lý cảnh báo.',
  description:
    'Một màn hình cho map, trạng thái thiết bị, cảnh báo và nhật ký vận hành.',
  highlights: [
    {
      icon: Activity,
      title: 'Map và cảnh báo',
      description: 'Ưu tiên xe cần xử lý ngay ở đầu ca trực.',
    },
    {
      icon: Waypoints,
      title: 'Thiết bị và chuyến đi',
      description: 'Theo dõi đầy đủ xe-thiết bị-chuyến đi.',
    },
    {
      icon: ShieldCheck,
      title: 'Phân quyền rõ ràng',
      description: 'Mỗi vai trò vào đúng phạm vi thao tác.',
    },
  ],
  proofLabels: ['Map realtime', 'Cảnh báo', 'Chuyến đi', 'Trạng thái hệ thống', 'Quản lý quyền'],
  assistText: 'Đăng nhập để tiếp tục ca trực.',
};
