'use client';

import PageContainer from '@/components/layout/page-container';

export default function ExclusivePage() {
  return (
    <PageContainer
      pageTitle='Exclusive Area'
      pageDescription='Plan-based access control via Clerk is disabled.'
    >
      <div className='rounded-lg border bg-card p-6 text-sm text-muted-foreground'>
        The original template used Clerk plans and organizations to gate access to this
        page (e.g. Pro plan only).
        <br />
        Since Clerk has been removed, this example of plan-based gating is disabled in
        <strong> frontend_v2</strong>.
      </div>
    </PageContainer>
  );
}
