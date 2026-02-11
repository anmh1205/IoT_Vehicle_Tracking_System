'use client';
import { PageContainer } from '@/components/layout/PageContainer';
import { FuelAnalyticsPage } from '@/features/fuel-analytics/components/fuel-analytics-page';

const FuelPage = () => {
  return (
    <PageContainer
      pageTitle="Fuel Analytics"
      pageDescription="Fuel consumption, cost analysis, and efficiency trends"
    >
      <FuelAnalyticsPage />
    </PageContainer>
  );
};
export default FuelPage;
