'use client';

import PageContainer from '@/components/layout/page-container';

export default function TeamPage() {
  return (
    <PageContainer
      pageTitle='Team Management'
      pageDescription='Team management via Clerk Organizations is disabled.'
    >
      <div className='rounded-lg border bg-card p-6 text-sm text-muted-foreground'>
        This page relied on Clerk Organizations to manage members, roles and security.
        <br />
        Since Clerk has been disabled, team management is not available in{' '}
        <strong>frontend_v2</strong>. Please continue to use the existing admin flows
        wired to backend v1.
      </div>
    </PageContainer>
  );
}
