'use client';

import { PageContainer } from '@/components/layout/PageContainer';
import { FuelAnalyticsPage } from '@/features/fuel-analytics/components/fuel-analytics-page';

const FuelPage = () => {
  return (
    <PageContainer
      pageTitle="Phân tích nhiên liệu"
      pageDescription="Theo dõi tiêu thụ nhiên liệu, chi phí và xu hướng hiệu suất theo từng giai đoạn"
    >
      <FuelAnalyticsPage />
    </PageContainer>
  );
};

export default FuelPage;
