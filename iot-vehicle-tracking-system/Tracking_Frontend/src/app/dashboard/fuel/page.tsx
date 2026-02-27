'use client';
import { PageContainer } from '@/components/layout/PageContainer';
import { FuelAnalyticsPage } from '@/features/fuel-analytics/components/fuel-analytics-page';

const FuelPage = () => {
  return (
    <PageContainer
      pageTitle="Phân tích nhiên liệu"
      pageDescription="Tiêu thụ nhiên liệu, phân tích chi phí và xu hướng hiệu suất"
    >
      <FuelAnalyticsPage />
    </PageContainer>
  );
};
export default FuelPage;
