'use client';

import PageContainer from '@/components/layout/page-container';

export default function WorkspacesPage() {
  return (
    <PageContainer
      pageTitle='Workspaces'
      pageDescription='Workspace management via Clerk is disabled. This page is currently a placeholder.'
    >
      <div className='rounded-lg border bg-card p-6 text-sm text-muted-foreground'>
        Multi-tenant workspaces and team management in <strong>frontend_v2</strong>{' '}
        were provided by Clerk in the original template.
        <br />
        In this deployment, Clerk has been disabled and authentication is handled by the
        legacy backend v1, so this page does not expose any workspace UI.
      </div>
    </PageContainer>
  );
}
