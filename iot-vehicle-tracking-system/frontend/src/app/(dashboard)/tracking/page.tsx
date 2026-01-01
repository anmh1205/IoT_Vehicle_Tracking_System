/**
 * Tracking Page - Real-time vehicle tracking map
 */
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { TrackingMap } from '@/features/tracking/components/tracking-map';

export default function TrackingPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Live Tracking"
        description="Real-time vehicle location tracking"
      />
      <TrackingMap />
    </PageContainer>
  );
}

