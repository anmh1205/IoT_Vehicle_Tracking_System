'use client';

import PageContainer from '@/components/layout/page-container';

export default function BillingPage() {
  return (
    <PageContainer
      pageTitle='Billing & Plans'
      pageDescription='Clerk Billing integration is disabled in this deployment.'
    >
      <div className='rounded-lg border bg-card p-6 text-sm text-muted-foreground'>
        The original dashboard template integrated <strong>Clerk Billing</strong> for
        organization-level subscriptions and plan management.
        <br />
        Since Clerk is not used here, billing and subscription management are handled
        (if needed) by your existing backend/services, not by <strong>frontend_v2</strong>.
      </div>
    </PageContainer>
  );
}
