import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication',
  description: 'IVM26 authentication using legacy backend v1 (Clerk disabled).'
};

export default function SignUpViewPage() {
  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <div className='max-w-md space-y-4 rounded-lg border bg-card p-6 text-center shadow-sm'>
        <h1 className='text-2xl font-semibold'>Sign up</h1>
        <p className='text-muted-foreground text-sm'>
          Clerk registration is disabled in this deployment.
        </p>
        <p className='text-muted-foreground text-sm'>
          New users should be created using the existing backend v1 authentication flow.
        </p>
      </div>
    </div>
  );
}
