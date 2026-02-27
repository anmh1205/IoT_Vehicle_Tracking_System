'use client';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatisticsOverview } from '@/features/statistics/components/statistics-overview';
const StatisticsPage = () => {
  return (
    <PageContainer
      pageTitle="Thống kê"
      pageDescription="Mức sử dụng đội xe, xu hướng uptime và tổng hợp vận hành"
    >
      <StatisticsOverview />
    </PageContainer>
  );
};
export default StatisticsPage;
