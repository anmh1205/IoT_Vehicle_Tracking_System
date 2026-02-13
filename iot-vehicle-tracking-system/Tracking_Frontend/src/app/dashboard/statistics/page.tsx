'use client';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatisticsOverview } from '@/features/statistics/components/statistics-overview';
const StatisticsPage = () => {
  return (
    <PageContainer
      pageTitle="Statistics"
      pageDescription="Fleet utilization, uptime trends, and operational summaries"
    >
      <StatisticsOverview />
    </PageContainer>
  );
};
export default StatisticsPage;
