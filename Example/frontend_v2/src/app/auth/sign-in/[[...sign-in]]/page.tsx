import { Metadata } from 'next';
import SignInViewPage from '@/features/auth/components/sign-in-view';

export const metadata: Metadata = {
  title: 'Authentication | Sign In',
  description: 'Sign In page for authentication (legacy backend v1).'
};

export default function Page() {
  // Clerk-based auth has been removed. This route is kept only as a thin
  // wrapper around the SignInViewPage, which informs users to use /login.
  return <SignInViewPage />;
}
