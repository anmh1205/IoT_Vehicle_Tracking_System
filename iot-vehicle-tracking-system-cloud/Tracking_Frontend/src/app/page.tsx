import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Giám sát đội xe realtime',
  description:
    'Theo dõi vị trí xe, cảnh báo tức thời, vùng, chuyến đi, nhiên liệu và trạng thái hệ thống trong một bề mặt vận hành tập trung.',
};

const RootPage = () => {
  redirect('/login');
};

export default RootPage;
