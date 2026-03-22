'use client';

import { PageContainer } from '@/components/layout/PageContainer';
import { StatisticsOverview } from '@/features/statistics/components/statistics-overview';

const StatisticsPage = () => {
  return (
    <PageContainer
      pageTitle="Thống kê"
      pageDescription="Mức sử dụng đội xe, uptime thiết bị và tổng hợp hiệu suất vận hành theo thời gian"
    >
      <StatisticsOverview />
    </PageContainer>
  );
};

export default StatisticsPage;
