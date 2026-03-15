import type { Metadata } from 'next';
import { LandingPage } from '@/features/marketing/components/landing-page';

export const metadata: Metadata = {
  title: 'Giám sát đội xe realtime | IoT Vehicle Tracking System',
  description:
    'Theo dõi vị trí xe, cảnh báo tức thời, geofence, chuyến đi, nhiên liệu và trạng thái hệ thống trong một bề mặt vận hành tập trung.',
};

const RootPage = () => {
  return <LandingPage />;
};

export default RootPage;
