import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication',
  description: 'IVM26 authentication using legacy backend v1 (Clerk disabled).'
};

export default function SignInViewPage() {
  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <div className='max-w-md space-y-4 rounded-lg border bg-card p-6 text-center shadow-sm'>
        <h1 className='text-2xl font-semibold'>Sign in</h1>
        <p className='text-muted-foreground text-sm'>
          Clerk authentication is disabled in this deployment.
        </p>
        <p className='text-muted-foreground text-sm'>
          Please use the existing authentication flow from frontend v1 / backend v1 to log in.
        </p>
      </div>
    </div>
  );
}
